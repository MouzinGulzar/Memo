import cron from "node-cron";
import { prisma } from "./db/prisma.js";
import { sendWhatsAppMessage } from "./whatsapp/connection.js";

export function startReminderScheduler() {
  console.log("⏰ [Scheduler] Starting Action Scheduler (runs every minute)...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();

      // Find all pending scheduled actions (reminders, appointments, follow-ups) that are due
      const actionsDue = await prisma.action.findMany({
        where: {
          scheduledFor: { lte: now },
          status: "pending",
        },
        select: { id: true, userId: true, userPhone: true, type: true, title: true },
      });

      if (actionsDue.length === 0) return;

      console.log(`⏰ [Scheduler] Found ${actionsDue.length} scheduled action(s) due for execution.`);

      for (const action of actionsDue) {
        try {
          await prisma.action.update({
            where: { id: action.id },
            data: { status: "processing" },
          });

          if (!action.userPhone) {
            console.warn(`⏰ [Scheduler] Action ${action.id} has no userPhone, skipping.`);
            continue;
          }

          console.log(`⏰ [Scheduler] Executing ${action.type}: "${action.title}" for ${action.userPhone}...`);

          const messageText = `⏰ *Reminder:* ${action.title}`;
          const success = await sendWhatsAppMessage(action.userPhone, messageText);

          await prisma.action.update({
            where: { id: action.id },
            data: { status: success ? "completed" : "failed", completedAt: success ? new Date() : undefined },
          });

          if (success) {
            // Store the reminder notification as a conversation event
            await prisma.conversationEvent.create({
              data: { userId: action.userId, userPhone: action.userPhone, role: "assistant", message: messageText },
            });
          }
        } catch (execErr) {
          console.error(`⏰ [Scheduler] Error processing action ${action.id}:`, execErr);
          try {
            await prisma.action.update({ where: { id: action.id }, data: { status: "failed" } });
          } catch {}
        }
      }
    } catch (err) {
      console.error("⏰ [Scheduler] Critical error in scheduler loop:", err);
    }
  });
}
