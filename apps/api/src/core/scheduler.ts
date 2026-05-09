import cron from "node-cron";
import { prisma } from "./db/prisma.js";
import { sendWhatsAppMessage } from "./whatsapp/connection.js";

export function startReminderScheduler() {
  console.log("⏰ [Scheduler] Starting Reminder Cron Job (runs every minute)...");

  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      
      // Find all pending reminders due for execution
      const remindersDue = await prisma.reminder.findMany({
        where: {
          scheduledAt: { lte: now },
          status: "pending",
        },
      });

      if (remindersDue.length === 0) return;

      console.log(`⏰ [Scheduler] Found ${remindersDue.length} pending reminder(s) due for execution.`);

      for (const reminder of remindersDue) {
        try {
          // Lock the reminder to prevent concurrent duplicate execution
          await prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: "processing" },
          });

          console.log(`⏰ [Scheduler] Executing reminder ID: ${reminder.id} ("${reminder.title}") for ${reminder.userPhone}...`);

          const messageText = `⏰ *Reminder:* ${reminder.title}`;
          const success = await sendWhatsAppMessage(reminder.userPhone, messageText);

          if (success) {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "completed" },
            });
            console.log(`⏰ [Scheduler] Reminder ID: ${reminder.id} successfully completed!`);
          } else {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "failed" },
            });
            console.error(`⏰ [Scheduler] Reminder ID: ${reminder.id} execution failed (WhatsApp send failed).`);
          }
        } catch (execErr) {
          console.error(`⏰ [Scheduler] Error processing reminder ID: ${reminder.id}:`, execErr);
          try {
            await prisma.reminder.update({
              where: { id: reminder.id },
              data: { status: "failed" },
            });
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("⏰ [Scheduler] Critical error in reminder cron job loop:", err);
    }
  });
}
