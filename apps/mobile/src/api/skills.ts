import api from "./axios";

export interface SkillCapability {
  key: string;
  name: string;
}

export interface Skill {
  id: string;
  key: string;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  capabilities: SkillCapability[];
  examplePrompts: string[];
  version: string;
}

export interface UserSkill extends Skill {
  userSkillId: string;
  addedAt: string;
}

export const getAllSkills = () => api.get<{ skills: Skill[] }>("/skills");

export const getMySkills = () => api.get<{ skills: UserSkill[] }>("/skills/me");

export const addSkill = (skillId: string) =>
  api.post("/skills/me", { skillId });

export const removeSkill = (skillId: string) =>
  api.delete(`/skills/me/${skillId}`);
