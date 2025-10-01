import type { FastifyInstance } from "fastify";
import { registerBullMqRoutes } from "./bullmq/bullmq.route";

export default function registerRoutes(fastify: FastifyInstance) {
  fastify.register(
    (instance) => {
      registerBullMqRoutes(instance);
    },
    { prefix: "/metrics" },
  );
}
