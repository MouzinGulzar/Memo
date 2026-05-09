import { GoogleGenAI } from "@google/genai";
import { prisma } from "./db/prisma.js";

interface ResolutionResult {
  action: "create" | "update" | "ignore";
  entityId?: string;
  title: string;
  canonicalData: Record<string, any>;
}

export async function resolveMemoryEvent(eventId: string) {
  try {
    // 1. Fetch the newly created MemoryEvent
    const memoryEvent = await prisma.memoryEvent.findUnique({
      where: { id: eventId }
    });

    if (!memoryEvent) {
      console.warn(`⚠️ [Resolution] MemoryEvent not found: ${eventId}`);
      return;
    }

    const { userPhone, type, title, content } = memoryEvent;

    console.log(`🧠 [Resolution] Resolving MemoryEvent ID: ${eventId} ("${title}", Type: "${type}")...`);

    // 2. Perform semantic similarity search using pgvector to fetch top candidates!
    const { findSimilarEntities } = await import("./embeddings.js");
    const existingEntities = await findSimilarEntities(userPhone, type, content, 10);

    // 3. Prepare context
    const newEventContext = {
      title,
      content,
      type
    };

    const existingEntitiesContext = existingEntities.map(ent => ({
      id: ent.id,
      title: ent.title,
      canonicalData: ent.canonicalData
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Safe fallback if API key is missing: create new entity
      const created = await prisma.memoryEntity.create({
        data: {
          userPhone,
          entityType: type,
          title: title || "Untitled Entity",
          canonicalData: { note: content },
          sourceEventId: eventId
        }
      });
      // Store embedding for the fallback-created canonical MemoryEntity
      import("./embeddings.js").then(({ saveEmbeddingForEntity }) => {
        saveEmbeddingForEntity(created.id, `${created.title} - ${JSON.stringify(created.canonicalData)}`);
      });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert cognitive memory operating system. Your job is to resolve newly learned historical events ("MemoryEvents") into current, canonical state records ("MemoryEntities").
Human memory evolves, and we want to determine if the new event should CREATE a new canonical MemoryEntity OR UPDATE an existing canonical MemoryEntity.

New Event to Resolve:
${JSON.stringify(newEventContext, null, 2)}

Existing Canonical MemoryEntities of this Type:
${JSON.stringify(existingEntitiesContext, null, 2)}

Instructions:
1. Check if the New Event modifies, corrects, refines, or matches an existing MemoryEntity.
2. If it is completely new (no match), set "action" to "create".
3. If it modifies an existing entity, set "action" to "update" and specify the "entityId". Merge the new facts cleanly into the existing "canonicalData" so that "canonicalData" represents the RESOLVED, CURRENT TRUTH.
4. If it is redundant/useless, set "action" to "ignore".

Return ONLY a valid JSON object in this exact schema. Do not include markdown formatting, backticks, or other text.

Schema:
{
  "action": "create" | "update" | "ignore",
  "entityId": string | null (id of matching existing entity, or null),
  "title": string (the resolved title of this canonical truth),
  "canonicalData": object (the resolved, current canonical state dictionary)
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const aiText = response.text || "";
    const resolved = JSON.parse(aiText) as ResolutionResult;

    if (resolved.action === "create") {
      const created = await prisma.memoryEntity.create({
        data: {
          userPhone,
          entityType: type,
          title: resolved.title || title || "Untitled Entity",
          canonicalData: resolved.canonicalData as any,
          sourceEventId: eventId
        }
      });
      console.log(`🧠 [Resolution] Created NEW MemoryEntity ID: ${created.id} ("${created.title}")`);

      // Store embedding for the newly created canonical MemoryEntity
      import("./embeddings.js").then(({ saveEmbeddingForEntity }) => {
        saveEmbeddingForEntity(created.id, `${created.title} - ${JSON.stringify(created.canonicalData)}`);
      });
    } else if (resolved.action === "update" && resolved.entityId) {
      const updated = await prisma.memoryEntity.update({
        where: { id: resolved.entityId },
        data: {
          title: resolved.title,
          canonicalData: resolved.canonicalData as any,
          sourceEventId: eventId
        }
      });
      console.log(`🧠 [Resolution] UPDATED existing MemoryEntity ID: ${updated.id} ("${updated.title}") with new canonical state.`);

      // Update embedding for the modified canonical MemoryEntity
      import("./embeddings.js").then(({ saveEmbeddingForEntity }) => {
        saveEmbeddingForEntity(updated.id, `${updated.title} - ${JSON.stringify(updated.canonicalData)}`);
      });
    } else {
      console.log(`🧠 [Resolution] Ignored redundant MemoryEvent.`);
    }

  } catch (error) {
    console.error(`🧠 [Resolution] Error resolving MemoryEvent ${eventId}:`, error);
  }
}
