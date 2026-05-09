import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../core/db/prisma.js";
import { randomBytes } from "crypto";

const SALT_ROUNDS = 12;
const COOKIE_NAME = "token";

const signupSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(7),
  password: z.string().min(6),
});

const signinSchema = z.object({
  phone: z.string().min(7),
  password: z.string().min(1),
});

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

function generateToken(user: { id: string; phone: string }) {
  return jwt.sign(
    {
      userId: user.id,
      phone: user.phone,
    },
    getJwtSecret(),
    {
      expiresIn: "30d",
    },
  );
}

function setAuthCookie(reply: any, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function authRoutes(fastify: FastifyInstance) {
  // POST /auth/signup
  fastify.post("/auth/signup", async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { name, phone, password } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (existing) {
      return reply.status(409).send({
        error: "Conflict",
        message: "A user with this phone number already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const apiKey = randomBytes(32).toString("hex");

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        password: hashedPassword,
        apiKey,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        apiKey: true,
        createdAt: true,
      },
    });

    const token = generateToken({
      id: user.id,
      phone: user.phone,
    });

    setAuthCookie(reply, token);

    return reply.status(201).send({
      user,
    });
  });

  // POST /auth/signin
  fastify.post("/auth/signin", async (request, reply) => {
    const parsed = signinSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Validation Error",
        issues: parsed.error.flatten().fieldErrors,
      });
    }

    const { phone, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: {
        phone,
      },
    });

    if (!user || !user.password) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid phone or password.",
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Invalid phone or password.",
      });
    }

    const token = generateToken({
      id: user.id,
      phone: user.phone,
    });

    setAuthCookie(reply, token);

    return reply.send({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        apiKey: user.apiKey,
        createdAt: user.createdAt,
      },
    });
  });

  // POST /auth/logout
  fastify.post("/auth/logout", async (_, reply) => {
    reply.clearCookie(COOKIE_NAME, {
      path: "/",
    });

    return reply.send({
      success: true,
    });
  });
}
