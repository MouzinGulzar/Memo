import { prisma } from "./db/prisma.js";

export interface WorkingMemory {
  lastTaskList?: { id: string; title: string; status: string }[];
  pendingClarification?: {
    type: string; // e.g. "reminder_datetime", "task_target"
    originalIntent: string;
    originalData: any;
  };
  activeTopic?: string;
  recentActions?: string[];
}

const SESSION_EXPIRY_MS = 60 * 60 * 1000; // 1 hour inactivity expiry

/**
 * Fetches the active ConversationSession for a user.
 * If expired or non-existent, returns a clean workingMemory and handles database sync.
 */
export async function getActiveSession(userPhone: string): Promise<WorkingMemory> {
  try {
    const session = await prisma.conversationSession.findUnique({
      where: { userPhone }
    });

    if (!session) {
      return {};
    }

    const now = new Date();
    if (now > session.expiresAt) {
      console.log(`🧠 [Session] Session expired for ${userPhone}. Resetting active working memory.`);
      // Delete or clear expired session in database
      await prisma.conversationSession.update({
        where: { userPhone },
        data: {
          workingMemory: {},
          expiresAt: new Date(now.getTime() + SESSION_EXPIRY_MS)
        }
      });
      return {};
    }

    return (session.workingMemory as any) || {};
  } catch (err: any) {
    console.error(`🧠 [Session] Error getting session for ${userPhone}:`, err.message || err);
    return {};
  }
}

/**
 * Updates the working memory of the session and resets the expiry time.
 */
export async function updateSession(userPhone: string, workingMemory: WorkingMemory) {
  try {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS);
    await prisma.conversationSession.upsert({
      where: { userPhone },
      create: {
        userPhone,
        workingMemory: workingMemory as any,
        expiresAt
      },
      update: {
        workingMemory: workingMemory as any,
        expiresAt
      }
    });
    console.log(`🧠 [Session] Session updated & extended for ${userPhone}. Topic: "${workingMemory.activeTopic || "none"}"`);
  } catch (err: any) {
    console.error(`🧠 [Session] Error updating session for ${userPhone}:`, err.message || err);
  }
}

/**
 * Clears the active session state.
 */
export async function clearSession(userPhone: string) {
  try {
    await prisma.conversationSession.update({
      where: { userPhone },
      data: {
        workingMemory: {},
        expiresAt: new Date()
      }
    });
    console.log(`🧠 [Session] Session force-cleared for ${userPhone}`);
  } catch (err) {
    console.error(`🧠 [Session] Error clearing session for ${userPhone}:`, err);
  }
}
