import { spawn } from "child_process";
import path from "path";

let pythonServer: any = null;
let pendingCallbacks: { resolve: (vector: number[]) => void; reject: (err: any) => void }[] = [];

function startEmbeddingServer() {
  if (pythonServer) return;

  const pythonExec = path.join(process.cwd(), "venv", "Scripts", "python.exe");
  const scriptPath = path.join(process.cwd(), "python", "embed_server.py");

  console.log("🧠 [Embedding Server] Starting persistent background embedding worker...");
  pythonServer = spawn(pythonExec, [scriptPath]);

  let buffer = "";

  pythonServer.stdout.on("data", (data: any) => {
    buffer += data.toString("utf8");
    if (buffer.includes("\n")) {
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const result = JSON.parse(line.trim());
            const callback = pendingCallbacks.shift();
            if (callback) {
              if (Array.isArray(result)) {
                callback.resolve(result);
              } else if (result.error) {
                callback.reject(new Error(result.error));
              } else {
                callback.reject(new Error("Invalid format from server"));
              }
            }
          } catch (e: any) {
            console.error("Failed to parse server line:", line, e);
          }
        }
      }
    }
  });

  pythonServer.stderr.on("data", (data: any) => {
    console.error("🧠 [Embedding Server Error]:", data.toString("utf8"));
  });

  pythonServer.on("close", (code: number) => {
    console.warn("🧠 [Embedding Server] Persistent worker shut down with code:", code);
    pythonServer = null;
    const callbacksToReject = [...pendingCallbacks];
    pendingCallbacks = [];
    for (const cb of callbacksToReject) {
      cb.reject(new Error("Server process closed unexpectedly"));
    }
  });
}

/**
 * Generates a 384-dimensional text embedding using the persistent Python worker.
 */
export function getEmbedding(text: string): Promise<number[]> {
  startEmbeddingServer();

  return new Promise((resolve, reject) => {
    pendingCallbacks.push({ resolve, reject });
    const sanitizedText = text.replace(/[\r\n]+/g, " ").trim();
    pythonServer.stdin.write(sanitizedText + "\n", "utf8");
  });
}
