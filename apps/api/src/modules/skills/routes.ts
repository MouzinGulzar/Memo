import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../core/db/prisma.js";

const addSkillSchema = z.object({
  skillId: z.string().uuid(),
});

export async function skillRoutes(fastify: FastifyInstance) {
  // GET /skills — list all available skills
  fastify.get("/skills", async (_request, reply) => {
    const skills = await prisma.skill.findMany({
      where: { isEnabled: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        key: true,
        name: true,
        shortDescription: true,
        description: true,
        category: true,
        capabilities: true,
        examplePrompts: true,
        version: true,
      },
    });

    return reply.send({ skills });
  });

  // GET /skills/me — get skills saved by the authenticated user
  fastify.get("/skills/me", async (request, reply) => {
    const userId = request.user!.id;

    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: {
          select: {
            id: true,
            key: true,
            name: true,
            shortDescription: true,
            description: true,
            category: true,
            capabilities: true,
            examplePrompts: true,
            version: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      skills: userSkills.map((us) => ({
        userSkillId: us.id,
        addedAt: us.createdAt,
        ...us.skill,
      })),
    });
  });

  // POST /skills/me — add a skill to the authenticated user
  fastify.post("/skills/me", async (request, reply) => {
    const parsed = addSkillSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const userId = request.user!.id;
    const { skillId } = parsed.data;

    const skill = await prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill || !skill.isEnabled) {
      return reply.status(404).send({ error: "Skill not found." });
    }

    const existing = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (existing) {
      return reply.status(409).send({ error: "Skill already added." });
    }

    const userSkill = await prisma.userSkill.create({
      data: { userId, skillId },
      include: {
        skill: {
          select: {
            id: true,
            key: true,
            name: true,
            shortDescription: true,
            category: true,
          },
        },
      },
    });

    return reply.status(201).send({
      userSkillId: userSkill.id,
      addedAt: userSkill.createdAt,
      ...userSkill.skill,
    });
  });

  // DELETE /skills/me/:skillId — remove a skill from the authenticated user
  fastify.delete("/skills/me/:skillId", async (request, reply) => {
    const { skillId } = request.params as { skillId: string };
    const userId = request.user!.id;

    const userSkill = await prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });

    if (!userSkill) {
      return reply.status(404).send({ error: "Skill not found in your list." });
    }

    await prisma.userSkill.delete({ where: { id: userSkill.id } });

    return reply.status(204).send();
  });
}
