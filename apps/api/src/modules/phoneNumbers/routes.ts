import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../core/db/prisma.js";

const addPhoneSchema = z.object({
  phoneNumbers: z
    .array(
      z.object({
        phone: z.string().min(7),
        label: z.string().optional(),
      }),
    )
    .min(1),
});

export async function phoneNumberRoutes(fastify: FastifyInstance) {
  // GET /phone-numbers — list all phone numbers for the authenticated user
  fastify.get("/phone-numbers", async (request, reply) => {
    const user = request.user!;

    const numbers = await prisma.userPhoneNumber.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return reply.send({ phoneNumbers: numbers });
  });

  fastify.post("/phone-numbers", async (request, reply) => {
    const user = request.user!;

    const parsed = addPhoneSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { phoneNumbers } = parsed.data;

    const phones = phoneNumbers.map((p) => p.phone);

    const conflictingSessions = await prisma.whatsAppSession.findMany({
      where: {
        phone: {
          in: phones,
        },
      },
      select: {
        phone: true,
      },
    });

    if (conflictingSessions.length > 0) {
      return reply.status(409).send({
        error: "Conflict",
        message:
          "Some phone numbers are already connected to WhatsApp sessions.",
        phones: conflictingSessions.map((s) => s.phone),
      });
    }

    const existingPhones = await prisma.userPhoneNumber.findMany({
      where: {
        phone: {
          in: phones,
        },
      },
      select: {
        phone: true,
      },
    });

    if (existingPhones.length > 0) {
      return reply.status(409).send({
        error: "Conflict",
        message: "Some phone numbers are already registered.",
        phones: existingPhones.map((p) => p.phone),
      });
    }

    const created = await prisma.userPhoneNumber.createMany({
      data: phoneNumbers.map((item) => ({
        userId: user.id,
        phone: item.phone,
        label: item.label,
      })),
    });

    return reply.status(201).send({
      success: true,
      count: created.count,
    });
  });
  // DELETE /phone-numbers/:id — remove a phone number
  fastify.delete("/phone-numbers/:id", async (request, reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };

    const record = await prisma.userPhoneNumber.findUnique({ where: { id } });

    if (!record || record.userId !== user.id) {
      return reply
        .status(404)
        .send({ error: "Not Found", message: "Phone number not found." });
    }

    await prisma.userPhoneNumber.delete({ where: { id } });

    return reply.send({ success: true });
  });
}
