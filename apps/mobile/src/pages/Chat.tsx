import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/chat.css";

const quickLinks = [
  {
    label: "Link WhatsApp",
    desc: "Connect your number to go live",
    to: "/link",
    icon: "📱",
  },
  {
    label: "Phone Numbers",
    desc: "Manage who your AI responds to",
    to: "/phones",
    icon: "📞",
  },
  {
    label: "Skills",
    desc: "Enable capabilities for your AI",
    to: "/skills",
    icon: "⚡",
  },
];

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
            <div className="chat-header-status">{user?.phone}</div>
          </div>
        </div>
        <button
          className="icon-btn chat-logout-mobile"
          onClick={handleLogout}
          title="Logout"
        >
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
      </header>

      <div className="chat-dashboard">
        <div className="chat-welcome">
          <div className="chat-welcome-icon">🤖</div>
          <h2>Your AI employee is ready</h2>
          <p>
            Complete the setup below to start handling customers on WhatsApp
            automatically.
          </p>
        </div>

        <div className="chat-quick-links">
          {quickLinks.map((item) => (
            <button
              key={item.to}
              className="chat-quick-card"
              onClick={() => navigate(item.to)}
            >
              <span className="chat-quick-icon">{item.icon}</span>
              <div className="chat-quick-info">
                <span className="chat-quick-label">{item.label}</span>
                <span className="chat-quick-desc">{item.desc}</span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="chat-quick-arrow"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>

        <div className="chat-status-card">
          <div className="chat-status-dot" />
          <div>
            <div className="chat-status-title">Conversations</div>
            <div className="chat-status-sub">
              Messages handled by your AI will appear here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
