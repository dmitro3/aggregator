import { Queue } from "bullmq";
import type { FastifyReply, FastifyRequest, FastifyInstance } from "fastify";

import { redis } from "../../instances";

const queues = ["programLogs", "syncPairs"].map(
  (name) => new Queue(name, { connection: redis.options }),
);

const getQueuesMetricsRoute = async (
  _request: FastifyRequest,
  reply: FastifyReply,
) => {
  const metrics = await Promise.all(
    queues.map((queue) => queue.exportPrometheusMetrics()),
  );
  return reply.send(metrics.join("\n"));
};

export const registerBullMqRoutes = (fastify: FastifyInstance) => {
  fastify.route({
    method: "GET",
    url: "/bullmq",
    handler: getQueuesMetricsRoute,
  });
};
