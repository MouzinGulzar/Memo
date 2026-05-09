import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db/prisma.js";
import { buildContext, ContextPackage } from "./context.js";
import { executeActions, storeMemories, upsertEntities } from "./actions.js";
import { generateQueryResponse } from "./response.js";
import { updateSession, WorkingMemory } from "./session.js";
import { sendWhatsAppMessage, sendWhatsAppPresence } from "../whatsapp/connection.js";

// Universal cognitive extraction schema — the single LLM output format
const CognitiveExtractionSchema = z.object({
  actions: z
    .array(
      z.object({
        operation: z.enum(["create", "update", "delete", "complete", "reopen", "query"]),
        type: z.string(),
        title: z.string().nullable().optional(),
        resolvedIds: z.array(z.string()).optional().default([]),
        scheduledFor: z.string().nullable().optional(),
        query: z.string().nullable().optional(),
        mutations: z.record(z.string(), z.any()).nullable().optional(),
      }),
    )
    .optional()
    .default([]),
  entities: z
    .array(z.object({ type: z.string(), name: z.string(), metadata: z.record(z.string(), z.any()).optional() }))
    .optional()
    .default([]),
  memories: z
    .array(
      z.object({
        category: z.string(),
        content: z.string(),
        entityName: z.string().nullable().optional(),
        entityType: z.string().nullable().optional(),
        importance: z.number().optional().default(0.5).transform(v => Math.min(1, Math.max(0, v))),
      }),
    )
    .optional()
    .default([]),
  response: z.string(),
  confidence: z.number().optional().default(0.8).transform(v => Math.min(1, Math.max(0, v))),
  needsClarification: z.boolean().optional().default(false),
});

export type CognitiveExtraction = z.infer<typeof CognitiveExtractionSchema>;

/**
 * Main entry point — replaces the old extractIntent().
 * Message is already saved in Message table by connection.ts.
 * This function processes it through the cognitive pipeline.
 */
export async function processCognitiveEvent(messageId: string, text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Cognitive] GEMINI_API_KEY not set");
    return;
  }

  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { userId: true, userPhone: true, rawPayload: true },
  });
  if (!msg) return;

  const { userId, userPhone, rawPayload } = msg;

  try {
    console.log(`\n🧠 [Cognitive] Processing: "${text}"`);

    // Store user message as conversation event
    await prisma.conversationEvent.create({
      data: { userId, userPhone, role: "user", message: text },
    });

    // Fetch user's active skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
    });

    if (userSkills.length === 0) {
      const available = await prisma.skill.findMany({
        where: { isEnabled: true },
        select: { name: true },
      });
      const skillNames = available.map((s) => s.name).join(", ");
      const replyMsg = `⚠️ You don't have any active skills configured on your Memo account right now!
Available skills you can enable:
👉 ${skillNames || "None available"}

Please configure at least one skill to start interacting.`;
      console.log(`🧠 [Cognitive] Blocked processing: No skills configured for user ${userId}`);
      await sendWhatsAppMessage(userPhone, replyMsg);
      await storeAssistantEvent(userId, userPhone, replyMsg);
      return;
    }

    // Build multi-layer context
    const context = await buildContext(userId, userPhone, text, rawPayload);
    console.log(`🧠 [Cognitive] Replied To Message:`, context.repliedToMessage);

    // Single LLM extraction with active user skills
    const extraction = await extractCognition(apiKey, text, context, userSkills);
    console.log(`🧠 [Cognitive] Extraction: ${extraction.actions.length} actions, ${extraction.memories.length} memories, ${extraction.entities.length} entities`);

    // Save extraction data on original message
    await prisma.message.update({
      where: { id: messageId },
      data: { intent: extraction.actions[0]?.operation || "none", intentData: extraction as any },
    });

    // Handle clarification
    if (extraction.needsClarification) {
      const wm: WorkingMemory = { ...context.workingMemory, pendingClarification: { type: "clarify", originalData: extraction } };
      await updateSession(userId, userPhone, wm);
      await sendWhatsAppMessage(userPhone, extraction.response);
      await storeAssistantEvent(userId, userPhone, extraction.response);
      await sendWhatsAppPresence(userPhone, "paused").catch(() => {});
      return;
    }

    // Clear pending clarification if it existed
    if (context.workingMemory.pendingClarification) {
      delete context.workingMemory.pendingClarification;
      await updateSession(userId, userPhone, context.workingMemory);
    }

    // Execute actions
    const hasQueryAction = extraction.actions.some((a) => a.operation === "query");
    let queryResults: string | null = null;

    if (extraction.actions.length > 0) {
      const actionResults = await executeActions(userId, userPhone, messageId, extraction.actions, context.workingMemory);

      // Update working memory with action list if tasks/reminders were queried or created
      if (actionResults.updatedWorkingMemory) {
        await updateSession(userId, userPhone, actionResults.updatedWorkingMemory);
      }

      if (hasQueryAction && actionResults.queryData) {
        await sendWhatsAppPresence(userPhone, "composing").catch(() => {});
        queryResults = await generateQueryResponse(apiKey, text, actionResults.queryData);
      }
    }

    // Store entities and memories
    if (extraction.entities.length > 0) {
      await upsertEntities(userId, extraction.entities);
    }
    if (extraction.memories.length > 0) {
      await storeMemories(userId, messageId, extraction.memories);
    }

    // Send response
    const finalResponse = queryResults || extraction.response;
    if (finalResponse && finalResponse.trim()) {
      await sendWhatsAppMessage(userPhone, finalResponse);
      await storeAssistantEvent(userId, userPhone, finalResponse);
    }

    await sendWhatsAppPresence(userPhone, "paused").catch(() => {});
  } catch (err: any) {
    console.error(`🧠 [Cognitive] Pipeline failed:`, err.message || err);
  }
}

async function storeAssistantEvent(userId: string, userPhone: string, message: string) {
  await prisma.conversationEvent.create({ data: { userId, userPhone, role: "assistant", message } });
}

async function extractCognition(apiKey: string, text: string, context: ContextPackage, userSkills: any[]): Promise<CognitiveExtraction> {
  const ai = new GoogleGenAI({ apiKey });

  // Dynamically compile active skills documentation
  const skillsOverview = userSkills.map((us, i) => {
    const s = us.skill;
    return `Skill ${i + 1}: ${s.name} (Key: "${s.key}")
- Category: ${s.category || "General"}
- Description: ${s.description || s.shortDescription || "No description available"}
- Capabilities: ${JSON.stringify(s.capabilities)}
- Supported Entities: ${JSON.stringify(s.supportedEntities)}
- Supported Actions: ${JSON.stringify(s.supportedActions)}
- Supported Intents: ${JSON.stringify(s.supportedIntents)}
- Memory Categories: ${JSON.stringify(s.memoryCategories)}
- Triggers: ${JSON.stringify(s.triggers)}
- Dynamic System Parameters:
  * Calendar Awareness Enabled: ${s.calendarAwarenessEnabled}
  * Conflict Detection Enabled: ${s.conflictDetectionEnabled}
  * Proactive Capabilities Enabled: ${s.proactiveCapabilitiesEnabled}
  * Semantic Search Enabled: ${s.semanticSearchEnabled}
  * Reasoning Enabled: ${s.reasoningEnabled}
  * Orchestration Enabled: ${s.orchestrationEnabled}
  * Autonomous Execution Enabled: ${s.autonomousExecutionEnabled}`;
  }).join("\n\n");

  // Dynamically compile supported entities/action types for JSON schema matching
  const allEntities = Array.from(new Set(userSkills.flatMap(us => us.skill.supportedEntities as string[] || [])));
  const entitiesString = allEntities.length > 0
    ? allEntities.map(e => `"${e}"`).join("|")
    : `"task"|"reminder"|"note"|"follow_up"|"appointment"`;

  const allMemoryCategories = Array.from(new Set(userSkills.flatMap(us => us.skill.memoryCategories as string[] || [])));
  const memoriesString = allMemoryCategories.length > 0
    ? allMemoryCategories.map(c => `"${c}"`).join("|")
    : `string`;

  // Dynamically compile skill examples
  const examplePrompts = userSkills.flatMap(us => us.skill.examplePrompts as string[] || []).slice(0, 15);
  const examplesSection = examplePrompts.map(ep => `- "${ep}"`).join("\n");

  // Dynamically compile active skill execution rules
  const allExecutionRules = userSkills.flatMap(us => us.skill.executionRules as string[] || []);
  const skillRulesSection = allExecutionRules.map((rule, idx) => `${idx + 18}. ${rule}`).join("\n");

  const prompt = `You are Memo, a highly sophisticated cognitive AI assistant. Your operational behavior, capabilities, rules, and categories are dynamically configured based on the user's active skills.

CURRENT TIME: ${context.currentTime} (${context.currentDayOfWeek}) (IST, UTC+5:30)
CURRENT YEAR: 2026

ACTIVE USER SKILLS CONFIGURATION:
${skillsOverview}

CONTEXT:
${JSON.stringify(
  {
    repliedToMessage: context.repliedToMessage,
    recentConversation: context.recentConversation.slice(-15).map((e) => ({ role: e.role, message: e.message })),
    workingMemory: {
      ...context.workingMemory,
      lastActionList: context.workingMemory.lastActionList?.map((a, i) => ({ index: i + 1, ...a })) || [],
    },
    pendingActions: context.pendingActions.map((a, i) => ({ index: i + 1, id: a.id, type: a.type, title: a.title, status: a.status, scheduledFor: a.scheduledFor })),
    recentlyCompletedActions: context.recentlyCompletedActions.map((a, i) => ({ index: i + 1, id: a.id, type: a.type, title: a.title })),
    relevantMemories: context.relevantMemories,
  },
  null,
  2,
)}

RULES:
1. REPLIED MESSAGE: If "repliedToMessage" exists, it is PRIMARY context. The user is directly referencing that message.
2. RECENT CHAT: Use "recentConversation" to understand ongoing discussion flow and continuity.
3. RESOLVING BY INDEX/ID: When user references "first", "second", "3 and 4", resolve from "pendingActions" or "lastActionList". Put exact "id" strings into "resolvedIds".
4. CORRECTIONS: If user corrects a title ("it's alliance not linis"), use operation="update" with resolvedId and new title in mutations.
5. MULTIPLE ACTIONS: Create separate entries in "actions" array for each independent operation.
6. TIME: Convert all times to ISO 8601 UTC. IST = UTC+5:30. Year is 2026.
7. CLARIFICATION: If vital info is missing (e.g. reminder without time), set needsClarification=true and ask in response.
8. MEMORY: If user shares a preference, decision, fact, or insight worth remembering, extract it into "memories".
9. QUERIES: For "what tasks do I have", "show reminders", etc., use operation="query" with appropriate type. The response should be a brief transition like "Let me check..."
10. GENERAL: For greetings/small talk, return empty actions and a natural response.
11. PENDING CLARIFICATION: If workingMemory.pendingClarification exists, the user is answering our previous question. Resolve based on originalData.
12. TASK CREATION: For multiple tasks ("Add tasks: X, Y, Z"), create separate action entries for each.
13. REOPENING: "bring it back", "reopen" → operation="reopen", resolve from recentlyCompletedActions.
14. DELETION: "delete", "remove" → operation="delete", resolve target ID.
15. COMPLETION: "done", "completed", "mark as done" → operation="complete", resolve target ID.
16. ENTITIES: Whenever the user introduces, updates, or mentions people, products, systems, organizations, or key entities, ALWAYS extract them into the "entities" array with their type, name, and any descriptive metadata (e.g. {"description": "..."}). Do not skip extracting entities.
17. PRONOUN RESOLUTION: If the user uses pronouns or relative terms (e.g., "who is he", "explain this", "delete it", "complete them", "who is this"), you MUST resolve these pronouns using the "repliedToMessage" text as the PRIMARY source of context. If the "repliedToMessage" mentions specific entities (like "Mouzin", "CodeRoad Softwares") and the user asks "And who is this?", they are asking about the entities inside the "repliedToMessage" itself (such as "Mouzin"). You MUST NOT answer about a previous topic (like "Mudasir") if that previous topic is completely absent from the "repliedToMessage". Use "recentConversation" history only as a secondary fallback. For example, if "repliedToMessage" is "Who is mudasir" and the user says "Who is he?", "he" refers to "mudasir".

${skillRulesSection ? `ACTIVE SKILLS SPECIFIC EXECUTION RULES:\n${skillRulesSection}` : ""}

DYNAMIC SKILL EXAMPLES:
${examplesSection}

Input: "${text}"

Return ONLY valid JSON matching this schema:
{
  "actions": [{ "operation": "create"|"update"|"delete"|"complete"|"reopen"|"query", "type": ${entitiesString}, "title": string|null, "resolvedIds": string[], "scheduledFor": string|null, "query": string|null, "mutations": object|null }],
  "entities": [{ "type": string, "name": string, "metadata": {} }],
  "memories": [{ "category": ${memoriesString}, "content": string, "entityName": string|null, "entityType": string|null, "importance": number }],
  "response": string,
  "confidence": number,
  "needsClarification": boolean
}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  let rawJson = JSON.parse(response.text || "{}");
  if (Array.isArray(rawJson)) rawJson = rawJson[0] || {};

  return CognitiveExtractionSchema.parse(rawJson);
}
