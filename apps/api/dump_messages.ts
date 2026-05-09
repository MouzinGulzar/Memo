import { prisma } from "./src/core/db/prisma.js";

async function main() {
  const msgs = await prisma.message.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      userPhone: true,
      text: true,
      intent: true,
      intentData: true,
      createdAt: true
    }
  });
  console.log("Last 20 messages:", JSON.stringify(msgs, null, 2));
}

main().catch(console.error);
