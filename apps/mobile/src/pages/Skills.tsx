import { useState, useEffect } from "react";
import {
  getAllSkills,
  getMySkills,
  addSkill,
  removeSkill,
} from "../api/skills";
import type { Skill } from "../api/skills";
import "../styles/skills.css";

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  scheduling: { icon: "📅", label: "Scheduling" },
  knowledge_management: { icon: "🧠", label: "Knowledge Management" },
  relationship_management: { icon: "🤝", label: "Relationship Management" },
  operations: { icon: "⚡", label: "Operations" },
  human_resources: { icon: "👥", label: "Human Resources" },
};

function categoryMeta(cat: string) {
  return CATEGORY_META[cat] ?? { icon: "🔌", label: cat.replace(/_/g, " ") };
}

export default function Skills() {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [mySkillIds, setMySkillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    try {
      const [all, mine] = await Promise.all([getAllSkills(), getMySkills()]);
      setAllSkills(all.data.skills);
      setMySkillIds(new Set(mine.data.skills.map((s) => s.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = async (skill: Skill) => {
    setToggling(skill.id);
    try {
      if (mySkillIds.has(skill.id)) {
        await removeSkill(skill.id);
        setMySkillIds((prev) => {
          const s = new Set(prev);
          s.delete(skill.id);
          return s;
        });
      } else {
        await addSkill(skill.id);
        setMySkillIds((prev) => new Set(prev).add(skill.id));
      }
    } catch {
      /* ignore */
    } finally {
      setToggling(null);
    }
  };

  const grouped = allSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const activeCount = mySkillIds.size;

  return (
    <div className="skills-screen">
      <header className="skills-header">
        <div>
          <h1>AI Skills</h1>
          <p className="skills-header-sub">
            {activeCount > 0
              ? `${activeCount} skill${activeCount > 1 ? "s" : ""} active — your AI employee is learning`
              : "Enable capabilities for your AI employee"}
          </p>
        </div>
        {activeCount > 0 && (
          <div className="skills-active-badge">{activeCount} active</div>
        )}
      </header>

      <div className="skills-body">
        {loading ? (
          <div className="skills-loading">
            <span className="spinner" />
            <span>Loading skills…</span>
          </div>
        ) : allSkills.length === 0 ? (
          <div className="skills-empty">
            <div className="skills-empty-icon">⚡</div>
            <p>No skills available yet</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, skills]) => {
            const meta = categoryMeta(category);
            return (
              <div key={category} className="skill-category">
                <div className="skill-category-header">
                  <div className="skill-category-title">
                    <span className="skill-category-icon">{meta.icon}</span>
                    <span className="skill-category-label">{meta.label}</span>
                  </div>
                  <span className="skill-category-count">
                    {skills.filter((s) => mySkillIds.has(s.id)).length}/
                    {skills.length} active
                  </span>
                </div>

                <div className="skill-cards">
                  {skills.map((skill) => {
                    const active = mySkillIds.has(skill.id);
                    const busy = toggling === skill.id;
                    const isExpanded = expanded === skill.id;

                    return (
                      <div
                        key={skill.id}
                        className={`skill-card${active ? " skill-card-active" : ""}`}
                      >
                        {/* Top row */}
                        <div className="skill-card-top">
                          <div className="skill-card-info">
                            <div className="skill-card-name-row">
                              <span className="skill-card-name">
                                {skill.name}
                              </span>
                              <span className="skill-version">
                                v{skill.version}
                              </span>
                            </div>
                            <p className="skill-card-desc">
                              {skill.shortDescription}
                            </p>
                          </div>
                          <button
                            className={`skill-toggle${active ? " skill-toggle-on" : ""}`}
                            onClick={() => toggle(skill)}
                            disabled={busy}
                            aria-label={
                              active ? "Disable skill" : "Enable skill"
                            }
                          >
                            {busy ? (
                              <span className="spinner-sm" />
                            ) : (
                              <span className="skill-toggle-track">
                                <span className="skill-toggle-thumb" />
                              </span>
                            )}
                          </button>
                        </div>

                        {/* Capabilities pills */}
                        {skill.capabilities?.length > 0 && (
                          <div className="skill-caps">
                            {skill.capabilities.map((cap) => (
                              <span key={cap.key} className="skill-cap-pill">
                                {cap.name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Expand toggle */}
                        <button
                          className="skill-expand-btn"
                          onClick={() =>
                            setExpanded(isExpanded ? null : skill.id)
                          }
                        >
                          {isExpanded ? "Hide details ↑" : "Show details ↓"}
                        </button>

                        {/* Expanded: full description + example prompts */}
                        {isExpanded && (
                          <div className="skill-details">
                            {skill.description && (
                              <p className="skill-full-desc">
                                {skill.description}
                              </p>
                            )}
                            {skill.examplePrompts?.length > 0 && (
                              <div className="skill-examples">
                                <div className="skill-examples-label">
                                  Example prompts
                                </div>
                                {skill.examplePrompts.map((prompt, i) => (
                                  <div key={i} className="skill-example-item">
                                    <span className="skill-example-quote">
                                      "
                                    </span>
                                    {prompt}
                                    <span className="skill-example-quote">
                                      "
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
