import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

interface JwtPayload {
  userId: string;
  phone: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not set");
  }

  return secret;
}

export async function apiKeyAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("user", undefined);

  fastify.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip authentication for public routes
      const publicRoutes = ["/", "/auth/signup", "/auth/signin"];
      if (
        publicRoutes.includes(request.url.split("?")[0]) ||
        request.routeOptions?.url === "/"
      ) {
        return;
      }

      const accessToken =
        request.cookies?.token ||
        request.headers["authorization"]?.replace("Bearer ", "") ||
        (request.query as any)?.accessToken;

      if (!accessToken || typeof accessToken !== "string") {
        reply.status(401).send({
          error: "Unauthorized",
          message: "Missing Access Token.",
        });
        return;
      }

      try {
        // Verify and decode JWT token
        const decoded = jwt.verify(accessToken, getJwtSecret()) as JwtPayload;

        // Fetch user from database using userId from token
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          reply.status(401).send({
            error: "Unauthorized",
            message: "User not found.",
          });
          return;
        }

        request.user = user;
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          reply.status(401).send({
            error: "Unauthorized",
            message: "Invalid or expired token.",
          });
          return;
        }

        fastify.log.error(error);
        reply.status(500).send({
          error: "Internal Server Error",
          message: "An error occurred during authentication.",
        });
      }
    },
  );
}

(apiKeyAuthPlugin as any)[Symbol.for("skip-override")] = true;
