import { prisma } from "../core/db/prisma.js";
import crypto from "crypto";

async function main() {
  const name = "Bazik Nisar";
  const phone = "8899443361";

  // Generate a 62-character hexadecimal API key (31 bytes * 2 hex chars/byte = 62 chars)
  const apiKey = crypto.randomBytes(31).toString("hex");

  console.log("Checking and upserting user...");
  try {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        name,
        apiKey,
      },
      create: {
        name,
        phone,
        apiKey,
      },
    });

    console.log("\n-------------------------------------------");
    console.log("🎉 User Created/Updated Successfully!");
    console.log("-------------------------------------------");
    console.log(`ID:      ${user.id}`);
    console.log(`Name:    ${user.name}`);
    console.log(`Phone:   ${user.phone}`);
    console.log(`API Key: ${user.apiKey}`);
    console.log(`Length:  ${user.apiKey.length} characters`);
    console.log("-------------------------------------------\n");
  } catch (error) {
    console.error("❌ Error creating user:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
