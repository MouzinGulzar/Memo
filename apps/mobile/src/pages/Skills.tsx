import { useState, useEffect } from "react";
import {
  getAllSkills,
  getMySkills,
  addSkill,
  removeSkill,
} from "../api/skills";
import type { Skill } from "../api/skills";
import "../styles/page.css";

export default function Skills() {
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [mySkillIds, setMySkillIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

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
      // ignore
    } finally {
      setToggling(null);
    }
  };

  const grouped = allSkills.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  return (
    <div className="page-screen">
      <header className="page-header">
        <h1>Skills</h1>
      </header>

      <div className="page-body">
        {loading ? (
          <div className="list-empty">
            <span className="spinner" />
          </div>
        ) : allSkills.length === 0 ? (
          <div className="list-empty">
            <p>No skills available</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, skills]) => (
            <div key={category} className="skill-group">
              <div className="skill-group-label">{category}</div>
              {skills.map((skill) => {
                const active = mySkillIds.has(skill.id);
                const busy = toggling === skill.id;
                return (
                  <div
                    key={skill.id}
                    className={`list-item skill-item${active ? " skill-active" : ""}`}
                  >
                    <div className="list-item-info">
                      <span className="list-item-title">{skill.name}</span>
                      <span className="list-item-sub">
                        {skill.shortDescription}
                      </span>
                    </div>
                    <button
                      className={`toggle-btn${active ? " toggle-on" : ""}`}
                      onClick={() => toggle(skill)}
                      disabled={busy}
                    >
                      {busy ? (
                        <span className="spinner-sm" />
                      ) : active ? (
                        "On"
                      ) : (
                        "Off"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
