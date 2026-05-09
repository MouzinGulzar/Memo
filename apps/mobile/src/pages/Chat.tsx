import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/chat.css";

export default function Chat() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  return (
    <div className="chat-shell">
      <header className="chat-header">
        <div className="chat-header-left">
          <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div>
            <div className="chat-header-name">{user?.name}</div>
            <div className="chat-header-status">online</div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="icon-btn"
            onClick={() => navigate("/link")}
            title="Link WhatsApp"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
          <button className="icon-btn" onClick={handleLogout} title="Logout">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <div className="chat-empty">
        <div className="chat-empty-icon">💬</div>
        <h2>Welcome, {user?.name}</h2>
        <p>Your conversations will appear here</p>
      </div>
    </div>
  );
}
