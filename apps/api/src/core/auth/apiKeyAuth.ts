import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { User } from "@prisma/client";
import { prisma } from "../db/prisma.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: User;
  }
}

export async function apiKeyAuthPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest("user", undefined);

  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip authentication for the root/healthcheck path
    if (request.url === "/" || request.routeOptions?.url === "/") {
      return;
    }

    const apiKey = request.headers["x-api-key"] || (request.query as any)?.apiKey;

    if (!apiKey || typeof apiKey !== "string") {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Missing API Key. Please provide 'x-api-key' in request headers or 'apiKey' as a query parameter.",
      });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { apiKey },
      });

      if (!user) {
        reply.status(401).send({
          error: "Unauthorized",
          message: "Invalid API Key.",
        });
        return;
      }

      request.user = user;
    } catch (error) {
      fastify.log.error(error);
      reply.status(500).send({
        error: "Internal Server Error",
        message: "An error occurred during authentication.",
      });
    }
  });
}

(apiKeyAuthPlugin as any)[Symbol.for("skip-override")] = true;

