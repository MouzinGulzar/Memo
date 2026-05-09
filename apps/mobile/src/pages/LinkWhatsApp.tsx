import { useState } from "react";
import api from "../api/axios";
import "../styles/link.css";

export default function LinkWhatsApp() {
  const [iframeKey, setIframeKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleConnect = async () => {
    setError("");
    setSuccessMsg("");
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

  const handleDisconnect = async () => {
    setError("");
    setSuccessMsg("");
    setDisconnecting(true);
    try {
      await api.get("/disconnect");
      setStarted(false);
      setSuccessMsg("WhatsApp session deleted.");
    } catch {
      setError("Failed to disconnect. Try again.");
    } finally {
      setDisconnecting(false);
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

          <div className="link-actions">
            <button
              className="btn-primary"
              onClick={handleConnect}
              disabled={connecting || disconnecting}
            >
              {connecting ? <span className="spinner" /> : "Generate QR Code"}
            </button>

            <button
              className="btn-danger"
              onClick={handleDisconnect}
              disabled={connecting || disconnecting}
            >
              {disconnecting ? <span className="spinner" /> : "Delete Session"}
            </button>
          </div>

          {error && (
            <p className="auth-error" style={{ marginTop: 4 }}>
              {error}
            </p>
          )}
          {successMsg && <p className="success-msg">{successMsg}</p>}
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
