import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../styles/link.css";

export default function LinkWhatsApp() {
  const navigate = useNavigate();
  const [iframeKey, setIframeKey] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  const handleConnect = async () => {
    setError("");
    setConnecting(true);
    try {
      await api.get("/connect");
      // reload iframe to show QR
      setIframeKey((k) => k + 1);
    } catch {
      setError("Failed to initiate connection. Try again.");
    } finally {
      setConnecting(false);
    }
  };

  const handleRefresh = () => {
    setIframeKey((k) => k + 1);
  };

  return (
    <div className="link-screen">
      <header className="link-header">
        <button
          className="icon-btn"
          onClick={() => navigate("/chat")}
          title="Back"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="link-header-title">Link WhatsApp</span>
        <div style={{ width: 36 }} />
      </header>

      <div className="link-body">
        <div className="link-card">
          <div className="link-icon">📱</div>
          <h2>Connect your WhatsApp</h2>
          <p>
            Tap the button below to generate a QR code, then scan it from
            WhatsApp on your phone.
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

        {/* QR iframe — shown after connect is triggered */}
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
          <p>After scanning the QR code with WhatsApp, tap refresh below.</p>
          <button className="btn-secondary" onClick={handleRefresh}>
            ↻ Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
