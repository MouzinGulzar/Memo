import { GoogleGenAI } from "@google/genai";

/**
 * Generates a natural language response from query results.
 * Used when the cognitive processor detects a "query" action —
 * the raw data comes from the action engine, and this function
 * synthesizes it into a human-friendly, beautifully formatted WhatsApp message.
 */
export async function generateQueryResponse(apiKey: string, queryText: string, queryData: any): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are Memo, a premium and highly contextual personal cognitive assistant. The user asked: "${queryText}"

Here is the raw structured data retrieved from their database to answer their query:
${JSON.stringify(queryData, null, 2)}

Synthesize a natural, helpful, and beautifully structured response in Urdu/English mix or simple English (matching the user's conversational style).

Formatting & Tone Guidelines:
1. Always format lists cleanly using modern bullet points or indices (e.g., "1. 📅 *Title* - time" or similar).
2. Use single asterisks around words or phrases for bold text (e.g. *bold text*), as this is the native WhatsApp bold syntax. Avoid double asterisks (**text**).
3. Convert all dates and times from UTC to the user's local timezone: Asia/Kolkata (IST, UTC+5:30) before showing them to the user. E.g., "04:30:00Z" should be presented as "10:00 AM IST" (or similar natural local format). Never output UTC timezone labels!
4. If there are no items found or the list is empty, reply with a warm, encouraging, or polite message indicating that nothing is scheduled or pending.
5. Keep the response clean, concise, and optimized for mobile screens (1-4 sentences or structured bullet points).
6. Do NOT mention any system internals, database records, JSON keys, or technical jargon. Make it sound like you directly know/recall this information.
7. You have full, live access to Google Search. If the database results are empty or if the user asks for external context, market insights, competitor analysis, pricing benchmarks, SaaS strategy, or technical learning, use Google Search to retrieve high-fidelity, real-time answers and blend them seamlessly with their local context.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    return response.text || "Here is what I found, but I couldn't summarize it properly.";
  } catch (error) {
    console.error("Error generating dynamic query response:", error);
    
    // Completely generic, non-hardcoded local fallback formatter
    if (queryData.items && Array.isArray(queryData.items)) {
      const typeLabel = queryData.type ? queryData.type.replace("_list", "").replace("_", " ") : "items";
      if (queryData.items.length === 0) {
        return `📅 You don't have any pending ${typeLabel}s right now!`;
      }
      const listContent = queryData.items
        .map((item: any) => {
          const index = item.index || "";
          const title = item.title || item.content || "Untitled";
          const details = item.scheduledFor 
            ? ` (Scheduled: ${new Date(item.scheduledFor).toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: true })})` 
            : "";
          return `${index}. *${title}*${details}`;
        })
        .join("\n");
      return `📅 *Your Active ${typeLabel.toUpperCase()}S:*\n\n${listContent}`;
    }
    return "Got it!";
  }
}
