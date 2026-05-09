import { useState } from "react";
import api from "../api/axios";
import "../styles/link.css";

export default function LinkWhatsApp() {
  const [iframeKey, setIframeKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      await api.get("/connect");
      setStarted(true);
      setIframeKey((k) => k + 1);
    } catch {
      setError("Failed to initiate connection. Try again.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="link-screen">
      <header className="page-header">
        <h1>Link WhatsApp</h1>
      </header>

      <div className="link-body">
        <div className="link-card">
          <div className="link-icon">📱</div>
          <h2>Connect your WhatsApp</h2>
          <p>
            Tap below to generate a QR code, then scan it from WhatsApp → Linked
            Devices.
          </p>
          <button
            className="btn-primary"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? <span className="spinner" /> : "Generate QR Code"}
          </button>
          {error && (
            <p className="auth-error" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}
        </div>

        {started && (
          <>
            <div className="link-iframe-wrap">
              <iframe
                key={iframeKey}
                src={`${baseUrl}/link`}
                title="WhatsApp QR"
                className="link-iframe"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="link-hint">
              <p>After scanning, tap refresh to confirm connection.</p>
              <button
                className="btn-secondary"
                onClick={() => setIframeKey((k) => k + 1)}
              >
                ↻ Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
