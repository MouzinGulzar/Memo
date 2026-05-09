import { GoogleGenAI } from "@google/genai";

/**
 * Generates a natural language response from query results.
 * Used when the cognitive processor detects a "query" action —
 * the raw data comes from the action engine, and this function
 * synthesizes it into a human-friendly WhatsApp message.
 */
export async function generateQueryResponse(apiKey: string, queryText: string, queryData: any): Promise<string> {
  if (queryData.type === "task_list") {
    if (!queryData.items || queryData.items.length === 0) {
      return "📝 You don't have any pending tasks right now! Great job! 🎉";
    }
    const taskList = queryData.items.map((t: any) => `${t.index}. ✅ *${t.title}*`).join("\n");
    return `📝 *Your Pending Tasks:*\n\n${taskList}`;
  }

  if (queryData.type === "reminder_list") {
    if (!queryData.items || queryData.items.length === 0) {
      return "⏰ You don't have any active reminders right now!";
    }
    const reminderList = queryData.items
      .map((r: any) => `${r.index}. ⏰ *${r.title}* (${r.scheduledFor ? new Date(r.scheduledFor).toLocaleString() : "unscheduled"})`)
      .join("\n");
    return `📅 *Your Active Reminders:*\n\n${reminderList}`;
  }

  // For memory/semantic queries — use LLM to synthesize a natural answer
  if (queryData.type === "memory_search") {
    if (!queryData.items || queryData.items.length === 0) {
      return "🔍 I couldn't find any memories matching that query. Try telling me more so I can remember!";
    }

    const ai = new GoogleGenAI({ apiKey });
    const memoriesContext = queryData.items
      .map((m: any, i: number) => `[Memory #${i + 1}] Category: ${m.category}, Content: ${m.content}`)
      .join("\n\n");

    const prompt = `You are Memo, a personal AI assistant. The user asked: "${queryText}"

Here are relevant memories from their database:

${memoriesContext}

Respond naturally in 1-3 sentences answering their question using the memories above. Use bold formatting for key points. Do not mention "database", "Memory #1", or system internals.`;

    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    return response.text || "🔍 I found some memories but couldn't summarize them. Let me try again!";
  }

  return "Got it!";
}
