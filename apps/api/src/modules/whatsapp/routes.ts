import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { connectWhatsApp, activeConnections, disconnectWhatsApp } from "../../core/whatsapp/connection.js";

export async function whatsappRoutes(fastify: FastifyInstance) {
  // Trigger WhatsApp connection process
  fastify.get("/connect", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const client = await connectWhatsApp(user.id);

    return {
      status: client.connectionStatus,
      message: client.connectionStatus === "connected"
        ? "WhatsApp is already connected!"
        : "WhatsApp connection initiated. Please navigate to /link to scan the QR code.",
    };
  });

  // Disconnect WhatsApp session
  fastify.get("/disconnect", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const disconnected = await disconnectWhatsApp(user.id);

    return {
      status: disconnected ? "disconnected" : "already_disconnected",
      message: disconnected
        ? "WhatsApp successfully disconnected and session deleted."
        : "No active WhatsApp session or connection found.",
    };
  });

  // Fetch live connection status
  fastify.get("/link/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const client = activeConnections.get(user.id);
    return {
      status: client ? client.connectionStatus : "disconnected",
    };
  });

  // Render beautiful QR Code or status page
  fastify.get("/link", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    let client = activeConnections.get(user.id);

    // If no client exists, automatically trigger connection
    if (!client) {
      client = await connectWhatsApp(user.id);
    }

    reply.type("text/html");

    // Case 1: Already Connected
    if (client.connectionStatus === "connected") {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp Connected | Memorae</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --bg: #090d16;
              --card-bg: rgba(17, 24, 39, 0.7);
              --primary: #10b981;
              --text: #f8fafc;
              --text-muted: #94a3b8;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Plus Jakarta Sans', sans-serif;
              background: var(--bg);
              color: var(--text);
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              overflow: hidden;
            }
            .container {
              background: var(--card-bg);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              border-radius: 24px;
              padding: 48px;
              text-align: center;
              max-width: 440px;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
              animation: fadeIn 0.6s ease-out;
            }
            .success-badge {
              width: 80px;
              height: 80px;
              background: rgba(16, 185, 129, 0.1);
              border: 1px solid rgba(16, 185, 129, 0.2);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px auto;
              animation: scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            .success-badge svg {
              width: 40px;
              height: 40px;
              color: var(--primary);
            }
            h1 {
              font-size: 26px;
              font-weight: 700;
              margin: 0 0 12px 0;
              background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
            }
            p {
              color: var(--text-muted);
              font-size: 15px;
              line-height: 1.6;
              margin: 0 0 32px 0;
            }
            .btn {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              border: none;
              padding: 14px 28px;
              color: white;
              font-weight: 600;
              border-radius: 12px;
              cursor: pointer;
              transition: transform 0.2s, box-shadow 0.2s;
              box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
            }
            .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            @keyframes scaleUp {
              from { transform: scale(0); }
              to { transform: scale(1); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-badge">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h1>WhatsApp Connected!</h1>
            <p>Your device is fully paired and authenticated. Memorae is ready to send and receive messages.</p>
            <button class="btn" onclick="window.close()">Close Window</button>
          </div>
        </body>
        </html>
      `;
    }

    // Case 2: Generating connection state
    if (client.connectionStatus === "connecting" && !client.qrCode) {
      return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="refresh" content="2">
          <title>Connecting... | Memorae</title>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600&display=swap" rel="stylesheet">
          <style>
            body {
              margin: 0;
              font-family: 'Plus Jakarta Sans', sans-serif;
              background: #090d16;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
            }
            .card {
              background: rgba(17, 24, 39, 0.7);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.08);
              padding: 48px;
              border-radius: 24px;
              text-align: center;
              box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
            }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.05);
              width: 50px;
              height: 50px;
              border-radius: 50%;
              border-left-color: #10b981;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 24px auto;
            }
            h2 { margin: 0 0 8px 0; font-size: 22px; font-weight: 600; }
            p { margin: 0; color: #94a3b8; font-size: 14px; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>Initializing Service</h2>
            <p>Creating your secure connection instance. Please hold on...</p>
          </div>
        </body>
        </html>
      `;
    }

    // Case 3: Display QR Code
    const apiKeyParam = (request.query as any)?.apiKey ? `?apiKey=${(request.query as any).apiKey}` : "";
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Connect WhatsApp | Memorae</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg: #090d16;
            --card-bg: rgba(17, 24, 39, 0.7);
            --primary: #10b981;
            --text: #f8fafc;
            --text-muted: #94a3b8;
          }
          body {
            margin: 0;
            padding: 24px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            background: var(--bg);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .container {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            max-width: 400px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          }
          h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 10px 0;
          }
          p {
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.5;
            margin: 0 0 30px 0;
          }
          .qr-wrapper {
            background: white;
            padding: 16px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 24px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
            transition: transform 0.3s;
          }
          .qr-code {
            display: block;
            width: 220px;
            height: 220px;
          }
          .status-indicator {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 14px;
            color: var(--text-muted);
          }
          .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #f59e0b;
            animation: pulse 1.5s infinite;
          }
          @keyframes pulse {
            0% { transform: scale(0.95); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.5; }
          }
        </style>
        <script>
          async function checkStatus() {
            try {
              const res = await fetch('/link/status${apiKeyParam}');
              const data = await res.json();
              if (data.status === 'connected') {
                window.location.reload();
              } else if (data.status === 'disconnected') {
                window.location.reload();
              }
            } catch (err) {
              console.error(err);
            }
          }
          setInterval(checkStatus, 3000);
        </script>
      </head>
      <body>
        <div class="container">
          <h1>Link WhatsApp</h1>
          <p>Open WhatsApp on your mobile, tap <b>Linked Devices</b>, then <b>Link a Device</b> and point your camera here.</p>
          <div class="qr-wrapper">
            <img class="qr-code" src="${client.qrCode}" alt="WhatsApp QR Code" />
          </div>
          <div class="status-indicator">
            <div class="dot"></div>
            <span>Waiting for connection scan...</span>
          </div>
        </div>
      </body>
      </html>
    `;
  });
}
