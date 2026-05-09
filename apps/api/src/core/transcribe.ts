import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "./db/prisma.js";

export async function transcribeAudio(
  messageId: string,
  audioBuffer: Buffer,
  extension: string = "ogg",
) {
  const tempDir = path.join(process.cwd(), "temp");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `${messageId}.${extension}`);

  fs.writeFileSync(tempFilePath, audioBuffer);

  try {
    await prisma.message.update({
      where: { id: messageId },
      data: { processingStatus: "processing" },
    });
  } catch (err) {
    console.error(
      `🔊 [Whisper] Failed to set processing status for message ${messageId}:`,
      err,
    );
  }

  const pythonExec =
    process.platform === "win32"
      ? path.join(process.cwd(), "venv", "Scripts", "python.exe")
      : path.join(process.cwd(), "venv", "bin", "python");

  const scriptPath = path.join(process.cwd(), "python", "transcribe.py");

  const cmd = `"${pythonExec}" "${scriptPath}" "${tempFilePath}"`;

  console.log(
    `🔊 [Whisper] Starting local transcription for message ID: ${messageId}...`,
  );

  exec(cmd, async (error, stdout, stderr) => {
    fs.unlink(tempFilePath, () => {});

    if (error) {
      console.error(
        `🔊 [Whisper] Error transcribing message ${messageId}:`,
        error,
      );

      console.error(stderr);

      try {
        await prisma.message.update({
          where: { id: messageId },
          data: { processingStatus: "failed" },
        });
      } catch {}

      return;
    }

    const transcript = stdout.trim();

    console.log(
      `🔊 [Whisper] Transcription SUCCESS for ${messageId}: "${transcript}"`,
    );

    try {
      await prisma.message.update({
        where: { id: messageId },
        data: {
          processedText: transcript,
          processingStatus: "completed",
        },
      });

      const { processCognitiveEvent } =
        await import("./cognitive/processor.js");

      processCognitiveEvent(messageId, transcript).catch((err) => {
        console.error("🤖 [Cognitive] Pipeline trigger failed:", err);
      });
    } catch (dbErr) {
      console.error(
        `🔊 [Whisper] DB Update failed for transcript of message ${messageId}:`,
        dbErr,
      );
    }
  });
}
