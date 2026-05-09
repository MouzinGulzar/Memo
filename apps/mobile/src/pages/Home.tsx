import { Link } from "react-router-dom";
import "../styles/home.css";

const pillars = [
  {
    icon: "🧠",
    title: "Second Brain",
    desc: "Memo remembers every customer, every decision, every conversation — permanently. No context ever lost.",
  },
  {
    icon: "🤖",
    title: "AI Employees",
    desc: "Hire AI staff that handle scheduling, CRM, HR, and operations 24/7 — without salaries or sick days.",
  },
  {
    icon: "💬",
    title: "WhatsApp-Native",
    desc: "Lives where your customers already are. No app downloads, no friction — just chat.",
  },
  {
    icon: "⚡",
    title: "Plug & Play Skills",
    desc: "Enable capabilities in one tap. Your AI team grows as your business grows.",
  },
  {
    icon: "🎙️",
    title: "Voice-First",
    desc: "Send voice notes, get intelligent replies. Works the way real conversations do.",
  },
  {
    icon: "🌍",
    title: "Zero Tech Setup",
    desc: "If you can use WhatsApp, you can run an AI-powered business. No developers needed.",
  },
];

const skills = [
  {
    icon: "📅",
    name: "Appointment & Scheduling Manager",
    desc: "Books meetings, detects conflicts, sends reminders, and manages your entire calendar.",
    caps: [
      "Appointment Booking",
      "Calendar Management",
      "Rescheduling",
      "Reminders",
    ],
  },
  {
    icon: "🧠",
    name: "Business Knowledge Manager",
    desc: "Stores decisions, strategies, and operational learnings so nothing is ever forgotten.",
    caps: [
      "Strategic Memory",
      "Decision Tracking",
      "Policy Memory",
      "Idea Storage",
    ],
  },
  {
    icon: "🤝",
    name: "CRM & Relationship Memory",
    desc: "Tracks every customer, vendor, and partner interaction with full relationship history.",
    caps: [
      "Contact Memory",
      "Communication History",
      "Follow-Up Management",
      "Sales Memory",
    ],
  },
  {
    icon: "⚡",
    name: "Executive Personal Assistant",
    desc: "Your operational brain — tasks, reminders, follow-ups, and daily briefings on autopilot.",
    caps: [
      "Task Management",
      "Smart Reminders",
      "Daily Briefings",
      "Priority Management",
    ],
  },
  {
    icon: "👥",
    name: "HR & Team Coordination",
    desc: "Manages employees, leave tracking, hiring workflows, and team coordination.",
    caps: [
      "Employee Memory",
      "Leave Management",
      "Hiring Tracking",
      "Shift Coordination",
    ],
  },
];

const steps = [
  { num: "01", title: "Sign Up", desc: "Create your account in seconds." },
  {
    num: "02",
    title: "Link WhatsApp",
    desc: "Scan a QR code to connect your number.",
  },
  {
    num: "03",
    title: "Enable Skills",
    desc: "Pick which AI employees to activate.",
  },
  {
    num: "04",
    title: "Go Live",
    desc: "Your AI team starts working immediately.",
  },
];

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-badge">🚀 The AI-Powered Business OS</div>
        <h1 className="home-hero-title">
          Your Business's
          <br />
          <span className="home-accent">Second Brain.</span>
        </h1>
        <p className="home-hero-sub">
          Memo is an all-in-one AI platform that gives your business permanent
          memory and a team of AI employees — living inside WhatsApp, working
          around the clock.
        </p>
        <div className="home-hero-cta">
          <Link to="/signup" className="btn-primary home-cta-btn">
            Hire Your AI Team Free
          </Link>
          <Link to="/signin" className="btn-ghost">
            Sign In
          </Link>
        </div>
        <div className="home-hero-visual">
          <div className="home-phone-mock">
            <div className="home-phone-bar">
              <div className="home-phone-dot" />
              <span>Memo · AI Employee</span>
              <div className="home-phone-status">● online</div>
            </div>
            <div className="home-phone-messages">
              <div className="home-msg home-msg-in">
                <span>Book Bilal tomorrow at 5 PM.</span>
              </div>
              <div className="home-msg home-msg-out">
                <span>
                  Done! Bilal is booked for tomorrow at 5 PM. I've also set a
                  reminder for you at 4:30 PM. 📅
                </span>
              </div>
              <div className="home-msg home-msg-in">
                <span>What did we decide about pricing last month?</span>
              </div>
              <div className="home-msg home-msg-out">
                <span>
                  You decided on a 10% discount for chronic patients. Discussed
                  on April 12th. 🧠
                </span>
              </div>
            </div>
            <div className="home-phone-typing">
              <span className="home-typing-dot" />
              <span className="home-typing-dot" />
              <span className="home-typing-dot" />
            </div>
          </div>
        </div>
      </section>

      {/* Second Brain + AI Employees value props */}
      <section className="home-section">
        <div className="home-section-label">Why Memo</div>
        <h2 className="home-section-title">
          One platform. Infinite memory. A full AI team.
        </h2>
        <div className="home-features-grid">
          {pillars.map((f) => (
            <div key={f.title} className="home-feature-card">
              <div className="home-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Skills showcase */}
      <section className="home-section home-section-alt">
        <div className="home-section-label">AI Employees</div>
        <h2 className="home-section-title">
          Meet your team — enable any skill instantly
        </h2>
        <div className="home-skills-grid">
          {skills.map((s) => (
            <div key={s.name} className="home-skill-card">
              <div className="home-skill-top">
                <span className="home-skill-icon">{s.icon}</span>
                <span className="home-skill-name">{s.name}</span>
              </div>
              <p className="home-skill-desc">{s.desc}</p>
              <div className="home-skill-caps">
                {s.caps.map((c) => (
                  <span key={c} className="home-skill-cap">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Link to="/signup" className="btn-primary home-cta-btn">
          Activate Your AI Team →
        </Link>
      </section>

      {/* How it works */}
      <section className="home-section">
        <div className="home-section-label">How it works</div>
        <h2 className="home-section-title">Up and running in minutes</h2>
        <div className="home-steps">
          {steps.map((s) => (
            <div key={s.num} className="home-step">
              <div className="home-step-num">{s.num}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="home-banner">
        <h2>Your business deserves a brain that never forgets.</h2>
        <p>
          Join business owners running on Memo — no technical skills required.
        </p>
        <Link to="/signup" className="btn-primary home-cta-btn">
          Get Started Free →
        </Link>
      </section>

      <footer className="home-footer">
        <span>
          © 2026 Memo · Second Brain & AI Employees for Business Owners
        </span>
      </footer>
    </div>
  );
}
