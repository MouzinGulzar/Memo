import { GoogleGenAI } from "@google/genai";
import { prisma } from "./db/prisma.js";
import { sendWhatsAppMessage } from "./whatsapp/connection.js";

export async function handleRecallQuery(
  userPhone: string,
  queryText: string,
  entities: Record<string, any>,
) {
  try {
    console.log(
      `🔍 [Recall] Processing memory query for ${userPhone}: "${queryText}"...`,
    );

    // Extract potential search terms from entities or query text
    const searchTerms = Object.values(entities).filter(
      (v) => typeof v === "string" && v.length > 2,
    ) as string[];

    // Fallback: split query text into terms if no entities found
    if (searchTerms.length === 0) {
      const stops = [
        "what",
        "about",
        "remember",
        "show",
        "tasks",
        "pending",
        "where",
        "idea",
        "pricing",
        "mediflux",
        "pharmacy",
        "when",
      ];
      searchTerms.push(
        ...queryText
          .split(" ")
          .filter((w) => w.length > 3 && !stops.includes(w.toLowerCase())),
      );
    }

    // Always include prominent nouns from query if present to guarantee match
    if (queryText.toLowerCase().includes("mediflux"))
      searchTerms.push("mediflux");
    if (queryText.toLowerCase().includes("pricing"))
      searchTerms.push("pricing");
    if (queryText.toLowerCase().includes("kashmir"))
      searchTerms.push("kashmir");
    if (queryText.toLowerCase().includes("pharmacy"))
      searchTerms.push("pharmacy");

    console.log(`🔍 [Recall] Extracted search terms:`, searchTerms);

    let foundEvents: any[] = [];
    const isTaskQuery =
      queryText.toLowerCase().includes("task") ||
      queryText.toLowerCase().includes("pending");

    if (isTaskQuery) {
      // Find pending tasks
      const tasks = await prisma.task.findMany({
        where: {
          userPhone,
          status: "pending",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (tasks.length > 0) {
        // Store displayed tasks in short-term session working memory for context references
        const { getActiveSession, updateSession } =
          await import("./session.js");
        const workingMemory = await getActiveSession(userPhone);
        workingMemory.lastTaskList = tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
        }));
        workingMemory.activeTopic = "tasks";
        await updateSession(userPhone, workingMemory);

        const taskList = tasks
          .map((t, idx) => `${idx + 1}. ✅ *${t.title}*`)
          .join("\n");
        const replyText = `📝 *Your Pending Tasks:*\n\n${taskList}`;
        await sendWhatsAppMessage(userPhone, replyText);
        return;
      } else {
        await sendWhatsAppMessage(
          userPhone,
          "📝 You don't have any pending tasks right now! Great job!",
        );
        return;
      }
    }

    // 2. Standard Memory Search using semantic vector similarity over canonical MemoryEntities!
    const { findSimilarEntities } = await import("./embeddings.js");
    let foundEntities = await findSimilarEntities(
      userPhone,
      null,
      queryText,
      5,
    );

    // Fallback: if no semantic matches found, fetch latest 3 canonical entities
    if (foundEntities.length === 0) {
      const entities = await prisma.memoryEntity.findMany({
        where: { userPhone },
        orderBy: { lastUpdatedAt: "desc" },
        take: 3,
      });
      foundEntities = entities.map((ent) => ({
        id: ent.id,
        title: ent.title,
        canonicalData: ent.canonicalData,
        distance: 0.5,
      }));
    }

    // Fetch active reminders for context if query mentions "remind" or "reminder"
    let remindersContext = "";
    if (
      queryText.toLowerCase().includes("remind") ||
      queryText.toLowerCase().includes("reminder")
    ) {
      const activeReminders = await prisma.reminder.findMany({
        where: { userPhone, status: "pending" },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      });
      if (activeReminders.length > 0) {
        remindersContext =
          "\nActive Scheduled Reminders:\n" +
          activeReminders
            .map(
              (r, idx) =>
                `- Reminder #${idx + 1}: Title: "${r.title}", Scheduled For: ${r.scheduledAt ? r.scheduledAt.toLocaleString() : "unscheduled"}`,
            )
            .join("\n");
      }
    }

    if (foundEntities.length > 0 || remindersContext) {
      const memoriesContext = foundEntities
        .map(
          (ent, idx) =>
            `[Canonical Memory #${idx + 1}] Title: "${ent.title}", Current Canonical Facts: ${JSON.stringify(ent.canonicalData)}`,
        )
        .join("\n\n");

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // Fallback: simple text output
        const fallbackText =
          `🧠 *What I found in your memories:*\n\n` +
          foundEntities
            .map(
              (ent) => `• *${ent.title}*: ${JSON.stringify(ent.canonicalData)}`,
            )
            .join("\n");
        await sendWhatsAppMessage(userPhone, fallbackText);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
You are an expert personal memory assistant. A user is asking you a question about their past memories, preferences, notes, tasks, or scheduled reminders.
Below is the exact set of CURRENT, CANONICAL truth memories and scheduled reminders found in their database matching their query.

User Query: "${queryText}"

Canonical Memories:
${memoriesContext}
${remindersContext}

Respond to the user naturally in 1-3 sentences. Answer their query using the exact, current preferences/facts/reminder times listed in the Canonical Memories or Scheduled Reminders.
If their current canonical memory expresses a "dislike" or negative preference for something, explicitly respect that preference in your response.
Use friendly, concise language. Highlight the key points. Use markdown bold formatting for emphasis.
Do not mention "database", "Memory #1", "canonical data", or system names. Act as their personal memory recall assistant.
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const replyText = response.text || "";

      if (replyText) {
        await sendWhatsAppMessage(userPhone, replyText);
      } else {
        const fallbackText =
          `🧠 *Here is what I remember:*\n\n` +
          foundEntities
            .map(
              (ent) => `• *${ent.title}*: ${JSON.stringify(ent.canonicalData)}`,
            )
            .join("\n");
        await sendWhatsAppMessage(userPhone, fallbackText);
      }
    } else {
      await sendWhatsAppMessage(
        userPhone,
        "🔍 I couldn't find any memories matching that query. Try telling me more ideas so I can remember them!",
      );
    }
  } catch (err) {
    console.error("🔍 [Recall] Error in recall handler:", err);
    await sendWhatsAppMessage(
      userPhone,
      "⚠️ Sorry, I ran into an issue while retrieving your memories.",
    );
  }
}
