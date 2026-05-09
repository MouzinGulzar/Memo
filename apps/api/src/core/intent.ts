import { z } from "zod";
import * as chrono from "chrono-node";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "./db/prisma.js";
import { getActiveSession, updateSession, WorkingMemory } from "./session.js";
import { findSimilarEntities } from "./embeddings.js";
import { sendWhatsAppMessage } from "./whatsapp/connection.js";

// Strict validation schema for the Cognitive Planner
const CognitivePlanSchema = z.object({
  intent: z.enum([
    "reminder",
    "task",
    "task_update",
    "note",
    "search",
    "general",
    "clarification",
  ]),
  action: z.enum([
    "create_reminder",
    "create_task",
    "complete_task",
    "delete_task",
    "update_task",
    "reopen_task",
    "create_note",
    "query_memory",
    "clarify",
    "none",
  ]),
  target: z.string().nullable(),
  resolvedIds: z.preprocess((val) => {
    if (Array.isArray(val)) return val.map(String);
    return [];
  }, z.array(z.string())),
  confidence: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? 0.5 : Math.min(Math.max(num, 0), 1);
  }, z.number()),
  isMeaningful: z.boolean(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  datetime: z.string().nullable(),
  importance: z.preprocess((val) => {
    const num = Number(val);
    return isNaN(num) ? 0.5 : Math.min(Math.max(num, 0), 1);
  }, z.number()),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().nullable(),
  entities: z.record(z.string(), z.any()),
});

type CognitivePlan = z.infer<typeof CognitivePlanSchema>;

export async function extractIntent(messageId: string, text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ [AI] GEMINI_API_KEY is not defined in the environment.");
    return;
  }

  // 1. Fetch user phone number from message
  const originalMsg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { userPhone: true, rawPayload: true },
  });

  if (!originalMsg) return;
  const userPhone = originalMsg.userPhone;
  const rawPayload = originalMsg.rawPayload as any;

  // Extract quoted/replied message text if present
  let quotedText: string | null = null;
  const unwrapped = rawPayload?.message;
  const extMsg = unwrapped?.extendedTextMessage;
  if (extMsg?.contextInfo?.quotedMessage) {
    const quoted = extMsg.contextInfo.quotedMessage;
    quotedText =
      quoted.conversation ||
      quoted.extendedTextMessage?.text ||
      quoted.imageMessage?.caption ||
      quoted.videoMessage?.caption ||
      null;
  }

  const now = new Date();
  const localTimeStr = now.toLocaleString("en-US", {
    timeZone: "Asia/Kolkata",
  });
  const localDayOfWeek = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });

  try {
    console.log(
      `🧠 [Cognitive Runtime] Initiating execution cycle for message: "${text}"...`,
    );

    // 2. Gather Context Package
    const workingMemory = await getActiveSession(userPhone);
    const pendingTasks = await prisma.task.findMany({
      where: { userPhone, status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    const pendingReminders = await prisma.reminder.findMany({
      where: { userPhone, status: "pending" },
      orderBy: { scheduledAt: "asc" },
      take: 20,
    });
    const completedTasks = await prisma.task.findMany({
      where: { userPhone, status: "completed" },
      orderBy: { completedAt: "desc" },
      take: 5,
    });
    const recentMsgLogs = await prisma.message.findMany({
      where: { userPhone },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { text: true, intent: true },
    });
    const semanticMemories = await findSimilarEntities(
      userPhone,
      null,
      text,
      10,
    );

    const contextPackage = {
      workingMemory: {
        ...workingMemory,
        lastTaskList:
          workingMemory.lastTaskList?.map((t, i) => ({
            index: i + 1,
            id: t.id,
            title: t.title,
            status: t.status,
          })) || [],
      },
      repliedToMessage: quotedText ? { text: quotedText } : null,
      pendingTasks: pendingTasks.map((t, i) => ({
        index: i + 1,
        id: t.id,
        title: t.title,
        status: t.status,
      })),
      pendingReminders: pendingReminders.map((r, i) => ({
        index: i + 1,
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduledAt,
      })),
      recentlyCompletedTasks: completedTasks.map((t, i) => ({
        index: i + 1,
        id: t.id,
        title: t.title,
        status: t.status,
        completedAt: t.completedAt,
      })),
      recentMessages: recentMsgLogs.reverse().map((m) => m.text),
      semanticMemories: semanticMemories.map((m) => ({
        title: m.title,
        canonicalData: m.canonicalData,
      })),
    };

    // 3. Invoke Cognitive Planner (Gemini-2.5-Flash)
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are Memo, the AI assistant for Mouzin.
Your job is to reason over active working memory and contextual data to plan the next action.

CURRENT USER LOCAL TIME: ${localTimeStr} (${localDayOfWeek}) (Timezone: IST, UTC+5:30)

Human communication is stateful, referential, incomplete, and contextual.
Analyze the user's message alongside the context provided to produce a complete plan.

CONGESTED CONTEXT PACKAGE:
${JSON.stringify(contextPackage, null, 2)}

ACTIVE SYSTEM RULES:
1. "First is completed" or "Mark the first one done" references the 1st task in the lastTaskList or pendingTasks context.
2. If the user specifies an action (e.g., setting a reminder or task) but lacks vital information (e.g. date/time for reminders), set needsClarification=true, action="clarify", and write a clarificationQuestion.
3. PRIORITIZE ACTIVE PENDING CLARIFICATIONS:
   - If workingMemory.pendingClarification is active, the user is ANSWERING our previous clarification question (e.g. we asked "Which reminder are you referring to?").
   - Even if their input text looks like "remind me to...", they are NOT requesting a brand new reminder. They are simply identifying the title of the reminder they want to know about.
   - For example, if we asked "Which reminder are you referring to?" and they say "remind me to take water", set intent="clarification", action="query_memory", needsClarification=false, and target="Remind to take water".
   - Merge the originalData with their response where appropriate.
4. CRITICAL TIME AND DATE CALCULATION RULE:
   - The user's exact current local time is: "${localTimeStr} (${localDayOfWeek})".
   - The current year is ALWAYS 2026. Do NOT use 2024.
   - If the user specifies a time (e.g. "2pm"), you MUST calculate the correct target date and time.
   - Return the calculated time in "datetime" as a standard ISO 8601 string in UTC. E.g. if the target is 7:00 PM local time (IST, UTC+5:30) on May 8, 2026, the UTC ISO string is "2026-05-08T13:30:00.000Z".
5. USER-INITIATED CORRECTIONS OR RE-TRIGGERS:
   - If the user says something like "sorry, I didn't mean X but Y", "actually I meant Y", or "not X but Y", they are correcting a previous message.
   - Look at their previous messages in recentMessages context.
   - If their previous message was a search/query (e.g. "when did I buy cross trees last time"), and they are now correcting it to "groceries", they are NOT trying to create a new reminder or task. They want to re-execute the previous query with the corrected word.
   - For example, if they say "sorry I didn't mean cross trees but groceries", set intent="search", action="query_memory", needsClarification=false, and set target to the fully reconstructed query (e.g. "when did I buy groceries last time"). Do NOT ask for times or try to schedule a reminder.
6. REPLIED/QUOTED MESSAGE CONTEXT:
   - If "repliedToMessage" is provided (e.g. { text: "Some original text" }), the user is explicitly replying to that specific message.
   - You MUST treat "repliedToMessage" as direct contextual reference to resolve what the user's current message is talking about.
   - If the user text contains words like "completed", "done", "cancel", "delete", "remove", "mark as completed", "finished", "finish", you MUST set intent="task_update" and action="complete_task" (or "delete_task"). Do NOT create a brand new task or reminder!
   - E.g. if the replied message mentions a task like "Buy Groceries" and they reply "complete that", set intent="task_update", action="complete_task", and set target to "Buy Groceries".
   - E.g. if they say "delete this" or "remove this task", set intent="task_update", action="delete_task", and set target to the task title mentioned in the replied message.
7. CORRECTING MISSPELLED TASKS / REMINDERS:
   - If the user says something like "It is alliance constructions", "I said alliance constructions. It was misspelled", or "actually I meant Y" in response to a recently added task, they are correcting a misspelling.
   - Do NOT create a brand new task or reminder! 
   - Set intent="task_update", action="update_task", set target to the old misspelled title (e.g. "Aligning Construction" or "first"), and set title to the new fully corrected task title (e.g. "Make scope of work for Alliance Constructions' new accounting project").
8. MULTIPLE TASK CREATION:
   - If the user specifies multiple tasks to be added at once (e.g. "Add tasks:\nBuy groceries\nTake dinner\nTake lunch", or list of tasks), set intent="task", action="create_task".
   - Extract ALL individual task titles as a string array inside the "entities" object as: "entities": { "tasks": ["Buy groceries", "Take dinner", "Take lunch"] }.
9. RESOLVING TARGETS BY ID (ULTIMATE REFERENTIAL MATCHING):
   - Whenever the user refers to specific tasks or reminders to complete, delete, or update, look up their indices/titles inside the "workingMemory.lastTaskList" or "pendingTasks" / "pendingReminders" context lists.
   - You MUST put the exact database "id" strings of all matched items into the "resolvedIds" array.
   - E.g. "Complete 3 and 4" -> Find items at index: 3 and index: 4 inside the list, and put their "id" strings into "resolvedIds": ["id_for_3", "id_for_4"].
   - E.g. "Delete the second one" -> Put the "id" of index: 2 into "resolvedIds".
   - E.g. "Mark both completed" -> Put the "id" strings of all tasks in lastTaskList into "resolvedIds".
10. REOPENING/BRINGING BACK COMPLETED TASKS:
    - If the user says "bring it back", "reopen this", "uncomplete", or "actually that is not done yet", they are trying to reopen a recently completed task.
    - Look at the "recentlyCompletedTasks" list in the context.
    - Set intent="task_update", action="reopen_task", and put the exact database "id" of the matched completed task into the "resolvedIds" array. If they swiped-replied to a completion confirmation, match the task title mentioned in that swiped message.

Allowed Intents:
- "reminder" (scheduling a task or action for a specific time)
- "task" (adding an actionable task without a time)
- "task_update" (updating, completing, deleting, or reopening a task)
- "note" (insights, strategic facts, things to remember)
- "search" (looking up information, asking questions)
- "clarification" (answering a follow-up clarification question)
- "general" (greetings, confirmations, small talk)

Allowed Actions:
- "create_reminder" | "create_task" | "complete_task" | "delete_task" | "update_task" | "reopen_task" | "create_note" | "query_memory" | "clarify" | "none"

Input Text: "${text}"

Return ONLY a valid JSON object matching the schema below. Do not include markdown backticks.

Schema:
{
  "intent": "reminder" | "task" | "task_update" | "note" | "search" | "clarification" | "general",
  "action": "create_reminder" | "create_task" | "complete_task" | "delete_task" | "update_task" | "reopen_task" | "create_note" | "query_memory" | "clarify" | "none",
  "target": string | null (e.g. resolved task old title, target title, or subject),
  "resolvedIds": string[] (An array of resolved item database "id" strings from the context lists that this action targets. E.g. ["id1", "id2"]. Put [] if none or not applicable),
  "confidence": number (0.00 to 1.00),
  "isMeaningful": boolean,
  "title": string | null,
  "summary": string | null,
  "datetime": string | null,
  "importance": number,
  "needsClarification": boolean,
  "clarificationQuestion": string | null,
  "entities": object
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    let rawJson = JSON.parse(response.text || "{}");
    if (Array.isArray(rawJson)) {
      rawJson = rawJson[0] || {};
    }
    const plan = CognitivePlanSchema.parse(rawJson);
    console.log(
      `🧠 [Cognitive Planner] Planned Action: "${plan.action}" for message ${messageId}. Intent: "${plan.intent}"`,
    );

    // Save intent data on original message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        intent: plan.intent,
        intentData: plan as any,
      },
    });

    // 4. Deterministic Action Executor Layer
    await executeCognitiveAction(
      userPhone,
      messageId,
      text,
      plan,
      workingMemory,
      contextPackage.pendingTasks,
      quotedText,
    );

    const { sendWhatsAppPresence } = await import("./whatsapp/connection.js");
    await sendWhatsAppPresence(userPhone, "paused").catch(() => {});
  } catch (err: any) {
    console.error(
      `🧠 [Cognitive Runtime] Execution cycle failed:`,
      err.message || err,
    );
  }
}

/**
 * Deterministically executes the planned cognitive action.
 */
async function executeCognitiveAction(
  userPhone: string,
  messageId: string,
  text: string,
  plan: CognitivePlan,
  workingMemory: WorkingMemory,
  pendingTasks: { id: string; title: string; status: string }[],
  quotedText: string | null = null,
) {
  // Clear any resolved clarification
  if (!plan.needsClarification) {
    delete workingMemory.pendingClarification;
  }

  // A. Handle Clarification Questions
  if (plan.needsClarification && plan.clarificationQuestion) {
    workingMemory.pendingClarification = {
      type: plan.intent === "reminder" ? "reminder_datetime" : "task_target",
      originalIntent: plan.intent,
      originalData: {
        title: plan.title || text,
        entities: plan.entities,
      },
    };
    await updateSession(userPhone, workingMemory);
    await sendWhatsAppMessage(userPhone, `💬 ${plan.clarificationQuestion}`);
    return;
  }

  const titleText = plan.title || plan.summary || "Untitled Memory";

  // B. Handle Task Updates / Completions
  if (plan.action === "complete_task") {
    // 1. Ultimate LLM-Resolved IDs Matching (First Priority)
    if (plan.resolvedIds && plan.resolvedIds.length > 0) {
      const taskPool =
        workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
          ? workingMemory.lastTaskList
          : pendingTasks;

      const validTasksToComplete = taskPool.filter((t) =>
        plan.resolvedIds!.includes(t.id),
      );

      if (validTasksToComplete.length > 0) {
        const ids = validTasksToComplete.map((t) => t.id);
        await prisma.task.updateMany({
          where: { id: { in: ids } },
          data: { status: "completed", completedAt: new Date() },
        });

        const titles = validTasksToComplete
          .map((t) => `• *"${t.title}"*`)
          .join("\n");
        await sendWhatsAppMessage(
          userPhone,
          `📝 Marked *${validTasksToComplete.length}* task(s) as completed! ✅\n\n${titles}\n\nAwesome job!`,
        );

        if (workingMemory.lastTaskList) {
          workingMemory.lastTaskList = workingMemory.lastTaskList.filter(
            (t) => !ids.includes(t.id),
          );
        }
        await updateSession(userPhone, workingMemory);
        return;
      }
    }

    // 2. Fallbacks (Backwards compatibility)
    if (
      plan.target?.toLowerCase().includes("both") ||
      plan.target?.toLowerCase().includes("all") ||
      text.toLowerCase().includes("both") ||
      text.toLowerCase().includes("all")
    ) {
      const taskPool =
        workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
          ? workingMemory.lastTaskList
          : pendingTasks;

      const taskIds = taskPool.map((t) => t.id);
      if (taskIds.length > 0) {
        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { status: "completed", completedAt: new Date() },
        });

        const titles = taskPool.map((t) => `• *"${t.title}"*`).join("\n");
        await sendWhatsAppMessage(
          userPhone,
          `📝 Marked all *${taskIds.length}* tasks as completed! ✅\n\n${titles}\n\nAwesome job!`,
        );

        if (workingMemory.lastTaskList) {
          workingMemory.lastTaskList = [];
        }
        await updateSession(userPhone, workingMemory);
        return;
      }
    }

    let targetTaskId: string | null = null;

    // Resolve "first" task using session lastTaskList fallback to current pendingTasks
    const taskPool =
      workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
        ? workingMemory.lastTaskList
        : pendingTasks;

    if (
      plan.target?.toLowerCase().includes("first") ||
      text.toLowerCase().includes("first")
    ) {
      targetTaskId = taskPool[0]?.id || null;
    } else if (plan.target) {
      const titleMatch = plan.target.toLowerCase().trim();
      if (titleMatch && titleMatch !== "that" && titleMatch !== "this") {
        const match = taskPool.find((t) =>
          t.title.toLowerCase().includes(titleMatch),
        );
        targetTaskId = match?.id || null;
      }
    }

    if (!targetTaskId && quotedText) {
      // Self-healing fuzzy resolve: Scan quoted text for any pending task titles
      const quotedLower = quotedText.toLowerCase();
      const match = taskPool.find((t) =>
        quotedLower.includes(t.title.toLowerCase()),
      );
      targetTaskId = match?.id || null;
    }

    if (targetTaskId) {
      const updatedTask = await prisma.task.update({
        where: { id: targetTaskId },
        data: { status: "completed", completedAt: new Date() },
      });
      console.log(
        `✅ [Task] Task ${targetTaskId} marked completed: "${updatedTask.title}"`,
      );
      await sendWhatsAppMessage(
        userPhone,
        `📝 *"${updatedTask.title}"* has been marked as completed! ✅ Awesome job!`,
      );

      // Update session list to remove completed task
      if (workingMemory.lastTaskList) {
        workingMemory.lastTaskList = workingMemory.lastTaskList.filter(
          (t) => t.id !== targetTaskId,
        );
      }
      await updateSession(userPhone, workingMemory);
    } else {
      await sendWhatsAppMessage(
        userPhone,
        `📝 I couldn't find any pending tasks to complete.`,
      );
    }
    return;
  }

  // B.2 Handle Task Deletions
  if (plan.action === "delete_task") {
    // 1. Ultimate LLM-Resolved IDs Matching (First Priority)
    if (plan.resolvedIds && plan.resolvedIds.length > 0) {
      const taskPool =
        workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
          ? workingMemory.lastTaskList
          : pendingTasks;

      const validTasksToDelete = taskPool.filter((t) =>
        plan.resolvedIds!.includes(t.id),
      );

      if (validTasksToDelete.length > 0) {
        const ids = validTasksToDelete.map((t) => t.id);
        await prisma.task.deleteMany({
          where: { id: { in: ids } },
        });

        const titles = validTasksToDelete
          .map((t) => `• *"${t.title}"*`)
          .join("\n");
        await sendWhatsAppMessage(
          userPhone,
          `🗑️ Successfully deleted *${validTasksToDelete.length}* task(s):\n\n${titles}`,
        );

        if (workingMemory.lastTaskList) {
          workingMemory.lastTaskList = workingMemory.lastTaskList.filter(
            (t) => !ids.includes(t.id),
          );
        }
        await updateSession(userPhone, workingMemory);
        return;
      }
    }

    let targetTaskId: string | null = null;

    const taskPool =
      workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
        ? workingMemory.lastTaskList
        : pendingTasks;

    if (
      plan.target?.toLowerCase().includes("first") ||
      text.toLowerCase().includes("first")
    ) {
      targetTaskId = taskPool[0]?.id || null;
    } else if (plan.target) {
      const titleMatch = plan.target.toLowerCase().trim();
      if (titleMatch && titleMatch !== "that" && titleMatch !== "this") {
        const match = taskPool.find((t) =>
          t.title.toLowerCase().includes(titleMatch),
        );
        targetTaskId = match?.id || null;
      }
    }

    if (!targetTaskId && quotedText) {
      // Self-healing fuzzy resolve: Scan quoted text for any pending task titles
      const quotedLower = quotedText.toLowerCase();
      const match = taskPool.find((t) =>
        quotedLower.includes(t.title.toLowerCase()),
      );
      targetTaskId = match?.id || null;
    }

    if (targetTaskId) {
      const deletedTask = await prisma.task.delete({
        where: { id: targetTaskId },
      });
      console.log(
        `🗑️ [Task] Task ${targetTaskId} deleted: "${deletedTask.title}"`,
      );
      await sendWhatsAppMessage(
        userPhone,
        `🗑️ *"${deletedTask.title}"* has been successfully deleted!`,
      );

      // Update session list to remove deleted task
      if (workingMemory.lastTaskList) {
        workingMemory.lastTaskList = workingMemory.lastTaskList.filter(
          (t) => t.id !== targetTaskId,
        );
      }
      await updateSession(userPhone, workingMemory);
    } else {
      await sendWhatsAppMessage(
        userPhone,
        `📝 I couldn't find any pending tasks to delete.`,
      );
    }
    return;
  }

  // B.3 Handle Task Updates / Corrections
  if (plan.action === "update_task") {
    let targetTaskId: string | null = null;
    const taskPool =
      workingMemory.lastTaskList && workingMemory.lastTaskList.length > 0
        ? workingMemory.lastTaskList
        : pendingTasks;

    if (plan.target) {
      const titleMatch = plan.target.toLowerCase().trim();
      if (titleMatch && titleMatch !== "that" && titleMatch !== "this") {
        const match = taskPool.find((t) =>
          t.title.toLowerCase().includes(titleMatch),
        );
        targetTaskId = match?.id || null;
      }
    }

    if (!targetTaskId && quotedText) {
      const quotedLower = quotedText.toLowerCase();
      const match = taskPool.find((t) =>
        quotedLower.includes(t.title.toLowerCase()),
      );
      targetTaskId = match?.id || null;
    }

    // Fallback: If no match, update the very first/most recent task in taskPool (e.g. correcting a misspelling)
    if (!targetTaskId && taskPool.length > 0) {
      targetTaskId = taskPool[0].id;
    }

    if (targetTaskId) {
      const oldTask = taskPool.find((t) => t.id === targetTaskId);
      const newTitle = plan.title || titleText;
      const updatedTask = await prisma.task.update({
        where: { id: targetTaskId },
        data: { title: newTitle },
      });
      console.log(
        `✏️ [Task] Task ${targetTaskId} updated: "${updatedTask.title}"`,
      );
      await sendWhatsAppMessage(
        userPhone,
        `✏️ Task updated from *"${oldTask?.title || "Untitled"}"* to *"${updatedTask.title}"*!`,
      );

      if (workingMemory.lastTaskList) {
        const idx = workingMemory.lastTaskList.findIndex(
          (t) => t.id === targetTaskId,
        );
        if (idx !== -1) {
          workingMemory.lastTaskList[idx].title = updatedTask.title;
          await updateSession(userPhone, workingMemory);
        }
      }
    } else {
      await sendWhatsAppMessage(
        userPhone,
        `📝 I couldn't find any pending task to update.`,
      );
    }
    return;
  }

  // B.4 Handle Reopening / Uncompleting Tasks
  if (plan.action === "reopen_task") {
    let targetTaskId: string | null = null;

    if (plan.resolvedIds && plan.resolvedIds.length > 0) {
      targetTaskId = plan.resolvedIds[0];
    }

    if (!targetTaskId) {
      // Fallback: search in completed tasks
      const completedTasksList = await prisma.task.findMany({
        where: { userPhone, status: "completed" },
        orderBy: { completedAt: "desc" },
        take: 10,
      });

      if (plan.target) {
        const titleMatch = plan.target.toLowerCase().trim();
        const match = completedTasksList.find((t) =>
          t.title.toLowerCase().includes(titleMatch),
        );
        targetTaskId = match?.id || null;
      }

      if (!targetTaskId && quotedText) {
        const quotedLower = quotedText.toLowerCase();
        const match = completedTasksList.find((t) =>
          quotedLower.includes(t.title.toLowerCase()),
        );
        targetTaskId = match?.id || null;
      }

      // If still not found, fallback to the very last completed task
      if (!targetTaskId && completedTasksList.length > 0) {
        targetTaskId = completedTasksList[0].id;
      }
    }

    if (targetTaskId) {
      const reopenedTask = await prisma.task.update({
        where: { id: targetTaskId },
        data: { status: "pending", completedAt: null },
      });
      console.log(
        `✏️ [Task] Task ${targetTaskId} reopened: "${reopenedTask.title}"`,
      );
      await sendWhatsAppMessage(
        userPhone,
        `🔄 *"${reopenedTask.title}"* has been brought back to your pending tasks!`,
      );

      // Add back to lastTaskList
      if (workingMemory.lastTaskList) {
        const alreadyExists = workingMemory.lastTaskList.some(
          (t) => t.id === targetTaskId,
        );
        if (!alreadyExists) {
          workingMemory.lastTaskList.unshift({
            id: reopenedTask.id,
            title: reopenedTask.title,
            status: "pending",
          });
          await updateSession(userPhone, workingMemory);
        }
      }
    } else {
      await sendWhatsAppMessage(
        userPhone,
        `📝 I couldn't find any recently completed tasks to bring back.`,
      );
    }
    return;
  }

  // C. Create New Task
  if (plan.action === "create_task") {
    const tasksToAdd: string[] = [];
    if (Array.isArray(plan.entities?.tasks) && plan.entities.tasks.length > 0) {
      tasksToAdd.push(...plan.entities.tasks);
    } else {
      tasksToAdd.push(titleText);
    }

    const createdTasks = [];
    for (const title of tasksToAdd) {
      const t = await prisma.task.create({
        data: {
          userPhone,
          title,
          status: "pending",
          sourceMessageId: messageId,
        },
      });
      createdTasks.push(t);
      console.log(`✅ [Task] Created pending Task: "${t.title}"`);
    }

    if (createdTasks.length > 1) {
      const titles = createdTasks.map((t) => `• *"${t.title}"*`).join("\n");
      await sendWhatsAppMessage(
        userPhone,
        `📝 Added *${createdTasks.length}* pending tasks:\n\n${titles}`,
      );

      // Auto-update working memory lastTaskList context with all new tasks
      if (!workingMemory.lastTaskList) workingMemory.lastTaskList = [];
      workingMemory.lastTaskList.unshift(
        ...createdTasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: "pending" as const,
        })),
      );
      workingMemory.activeTopic = "tasks";
      await updateSession(userPhone, workingMemory);
    } else if (createdTasks.length === 1) {
      const newTask = createdTasks[0];
      await sendWhatsAppMessage(
        userPhone,
        `📝 Added pending task: *"${newTask.title}"*`,
      );

      // Auto-update working memory lastTaskList context
      if (!workingMemory.lastTaskList) workingMemory.lastTaskList = [];
      workingMemory.lastTaskList.unshift({
        id: newTask.id,
        title: newTask.title,
        status: "pending",
      });
      workingMemory.activeTopic = "tasks";
      await updateSession(userPhone, workingMemory);
    }
    return;
  }

  // D. Create New Reminder
  if (plan.action === "create_reminder" && plan.datetime) {
    const parsedDate = chrono.parseDate(plan.datetime);
    if (parsedDate) {
      await prisma.reminder.create({
        data: {
          messageId,
          userPhone,
          title: titleText,
          rawDateText: plan.datetime,
          scheduledAt: parsedDate,
          status: "pending",
        },
      });
      console.log(
        `⏰ [Reminder] Scheduled reminder for: ${parsedDate.toISOString()}`,
      );
      await sendWhatsAppMessage(
        userPhone,
        `⏰ Successfully scheduled reminder: *"${titleText}"* for *${parsedDate.toLocaleString()}*!`,
      );
    } else {
      await sendWhatsAppMessage(
        userPhone,
        `⏰ I couldn't parse the date/time *"${plan.datetime}"*. Could you try saying it differently?`,
      );
    }
    return;
  }

  // E. Create New Note (Long-term Memory)
  if (plan.action === "create_note" && plan.isMeaningful) {
    const createdEvent = await prisma.memoryEvent.create({
      data: {
        userPhone,
        type: "note",
        title: titleText,
        content: text,
        sourceMessageId: messageId,
        importance: plan.importance,
        metadata: plan.entities as any,
      },
    });

    import("./embeddings.js").then(({ saveEmbeddingForEvent }) => {
      saveEmbeddingForEvent(createdEvent.id, text);
    });

    import("./resolution.js").then(({ resolveMemoryEvent }) => {
      resolveMemoryEvent(createdEvent.id).catch((err) =>
        console.error("🧠 [Resolution] Trigger failed:", err),
      );
    });
    console.log(`🧠 [Memory] Stored new note Event: "${titleText}"`);
    return;
  }

  // F. Query Memory (Recall Query)
  if (plan.action === "query_memory" || plan.intent === "search") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const midwayPrompt = `You are Memo, Mouzin's assistant. Respond to the query: "${text}" with a brief, friendly, natural 1-sentence transition saying you'll look that up, check that, or pull that up right now. Include a relevant emoji. Do not use generic phrases.`;
      try {
        const midwayRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: midwayPrompt,
        });
        const midwayText =
          midwayRes.text?.trim() ||
          "Checking my memories for you real quick... 🧠";
        await sendWhatsAppMessage(userPhone, midwayText);
      } catch (midwayErr) {
        await sendWhatsAppMessage(
          userPhone,
          "Checking my memories for you real quick... 🧠",
        );
      }
    }

    const { sendWhatsAppPresence } = await import("./whatsapp/connection.js");
    await sendWhatsAppPresence(userPhone, "composing");

    const { handleRecallQuery } = await import("./recall.js");
    await handleRecallQuery(userPhone, text, plan.entities || {});

    await sendWhatsAppPresence(userPhone, "paused");
    return;
  }

  // G. General Conversational / Greetings Fallback
  if (plan.intent === "general") {
    // Generate organic fallback conversational response using Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are Memo, the AI assistant for Mouzin. Respond to: "${text}" in 1 brief sentence.`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const reply = response.text || "Got it!";
      await sendWhatsAppMessage(userPhone, reply);
    }
    return;
  }
}
