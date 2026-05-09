import { spawn } from "child_process";
import path from "path";

/**
 * Generates a local text embedding vector (384-dimensional) using BAAI/bge-small-en-v1.5.
 * 
 * @param text - The text content to embed.
 * @returns A Promise resolving to the array of 384 numbers representing the embedding.
 */
let pythonServer: any = null;
let pendingCallbacks: { resolve: (vector: number[]) => void; reject: (err: any) => void }[] = [];

function startEmbeddingServer() {
  if (pythonServer) return;

  const pythonExec = path.join(process.cwd(), "venv", "Scripts", "python.exe");
  const scriptPath = path.join(process.cwd(), "python", "embed_server.py");

  console.log("🧠 [Embedding Server] Starting persistent background embedding worker...");
  pythonServer = spawn(pythonExec, [scriptPath]);

  let buffer = "";

  pythonServer.stdout.on("data", (data: any) => {
    buffer += data.toString("utf8");
    if (buffer.includes("\n")) {
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const result = JSON.parse(line.trim());
            const callback = pendingCallbacks.shift();
            if (callback) {
              if (Array.isArray(result)) {
                callback.resolve(result);
              } else if (result.error) {
                callback.reject(new Error(result.error));
              } else {
                callback.reject(new Error("Invalid format from server"));
              }
            }
          } catch (e: any) {
            console.error("Failed to parse server line:", line, e);
          }
        }
      }
    }
  });

  pythonServer.stderr.on("data", (data: any) => {
    console.error("🧠 [Embedding Server Error]:", data.toString("utf8"));
  });

  pythonServer.on("close", (code: number) => {
    console.warn("🧠 [Embedding Server] Persistent worker shut down with code:", code);
    pythonServer = null;
    const callbacksToReject = [...pendingCallbacks];
    pendingCallbacks = [];
    for (const cb of callbacksToReject) {
      cb.reject(new Error("Server process closed unexpectedly"));
    }
  });
}

/**
 * Generates a local text embedding vector (384-dimensional) using BAAI/bge-small-en-v1.5.
 * Uses a persistent, hot background server for millisecond speeds.
 */
export function getEmbedding(text: string): Promise<number[]> {
  startEmbeddingServer();

  return new Promise((resolve, reject) => {
    pendingCallbacks.push({ resolve, reject });
    // Normalize string to guarantee single-line transmission
    const sanitizedText = text.replace(/[\r\n]+/g, " ").trim();
    pythonServer.stdin.write(sanitizedText + "\n", "utf8");
  });
}

import { prisma } from "./db/prisma.js";

/**
 * Generates and stores the embedding for a MemoryEvent.
 */
export async function saveEmbeddingForEvent(eventId: string, text: string) {
  try {
    const vector = await getEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "MemoryEvent" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      eventId
    );
    console.log(`🧠 [Embedding] Stored 384-d vector for MemoryEvent ${eventId}`);
  } catch (err: any) {
    console.error(`🧠 [Embedding] Failed to store embedding for MemoryEvent ${eventId}:`, err.message || err);
  }
}

/**
 * Generates and stores the embedding for a MemoryEntity.
 */
export async function saveEmbeddingForEntity(entityId: string, text: string) {
  try {
    const vector = await getEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "MemoryEntity" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      entityId
    );
    console.log(`🧠 [Embedding] Stored 384-d vector for MemoryEntity ${entityId}`);
  } catch (err: any) {
    console.error(`🧠 [Embedding] Failed to store embedding for MemoryEntity ${entityId}:`, err.message || err);
  }
}

/**
 * Performs a vector cosine similarity search in PostgreSQL using pgvector
 * to find the most semantically similar MemoryEntities for a user and type.
 */
export async function findSimilarEntities(
  userPhone: string,
  entityType: string | null,
  text: string,
  limit: number = 5
): Promise<{ id: string; title: string; canonicalData: any; distance: number }[]> {
  try {
    const vector = await getEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;
    
    let query = `SELECT id, title, "canonicalData", (embedding <=> $1::vector) as distance 
                 FROM "MemoryEntity" 
                 WHERE "userPhone" = $2 AND embedding IS NOT NULL`;
    const params: any[] = [vectorStr, userPhone];
    
    if (entityType) {
      query += ` AND "entityType" = $3`;
      params.push(entityType);
    }
    
    query += ` ORDER BY distance ASC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const matches = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return (matches || []).map(m => ({
      id: m.id,
      title: m.title,
      canonicalData: m.canonicalData,
      distance: Number(m.distance)
    }));
  } catch (err: any) {
    console.error("🧠 [Embedding] Semantic search failed:", err.message || err);
    return [];
  }
}
