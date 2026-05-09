import dotenv from "dotenv";
dotenv.config();

async function test() {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    console.log("No key found");
    return;
  }

  const url = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  console.log("Sending raw fetch to Zhipu...");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "glm-4.5-flash",
        messages: [{ role: "user", content: "Hi" }],
      }),
    });

    console.log("Response status:", response.status);
    const json = await response.json();
    console.log("Response body:", JSON.stringify(json, null, 2));
  } catch (err: any) {
    console.log("Error during raw fetch:", err.message || err);
  }
}

test();
