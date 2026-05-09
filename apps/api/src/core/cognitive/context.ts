import { prisma } from "../db/prisma.js";
import { getSession, WorkingMemory } from "./session.js";

export interface ContextPackage {
  repliedToMessage: { text: string } | null;
  recentConversation: { role: string; message: string; createdAt: Date }[];
  pendingActions: { id: string; type: string; title: string; status: string; scheduledFor: Date | null }[];
  recentlyCompletedActions: { id: string; type: string; title: string; completedAt: Date | null }[];
  relevantMemories: { id: string; category: string; content: string }[];
  workingMemory: WorkingMemory;
  currentTime: string;
  currentDayOfWeek: string;
}

export async function buildContext(userId: string, userPhone: string, text: string, rawPayload: any): Promise<ContextPackage> {
  // 1. Extract quoted/replied message
  let repliedToMessage: { text: string } | null = null;
  const unwrapped = rawPayload?.message;
  const extMsg = unwrapped?.extendedTextMessage;
  if (extMsg?.contextInfo?.quotedMessage) {
    const quoted = extMsg.contextInfo.quotedMessage;
    const quotedText =
      quoted.conversation ||
      quoted.extendedTextMessage?.text ||
      quoted.imageMessage?.caption ||
      quoted.videoMessage?.caption ||
      null;
    if (quotedText) repliedToMessage = { text: quotedText };
  }

  // 2. Recent conversation events (scoped to this phone's chat)
  const recentConversation = await prisma.conversationEvent.findMany({
    where: { userPhone },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { role: true, message: true, createdAt: true },
  });

  // 3. Pending actions for this user
  const pendingActions = await prisma.action.findMany({
    where: { userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, type: true, title: true, status: true, scheduledFor: true },
  });

  // 4. Recently completed actions
  const recentlyCompletedActions = await prisma.action.findMany({
    where: { userId, status: "completed" },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: { id: true, type: true, title: true, completedAt: true },
  });

  // 5. Semantic memory search
  let relevantMemories: { id: string; category: string; content: string }[] = [];
  try {
    const { getEmbedding } = await import("../embeddings.js");
    const vector = await getEmbedding(text);
    const vectorStr = `[${vector.join(",")}]`;
    const matches = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, category, content FROM "Memory" WHERE "userId" = $1 AND embedding IS NOT NULL ORDER BY (embedding <=> $2::vector) ASC LIMIT 10`,
      userId,
      vectorStr,
    );
    relevantMemories = (matches || []).map((m) => ({ id: m.id, category: m.category, content: m.content }));
  } catch {
    // Embedding server might not be running
  }

  // 6. Session working memory (per phone)
  const workingMemory = await getSession(userPhone);

  const now = new Date();
  return {
    repliedToMessage,
    recentConversation: recentConversation.reverse(),
    pendingActions,
    recentlyCompletedActions: recentlyCompletedActions.map((a) => ({ ...a, type: a.type })),
    relevantMemories,
    workingMemory,
    currentTime: now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
    currentDayOfWeek: now.toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Kolkata" }),
  };
}
