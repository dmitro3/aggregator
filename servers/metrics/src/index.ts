import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";

import { getEnv } from "./env";
import registerRoutes from "./routes";

const server = fastify({
  logger: true,
  maxParamLength: 5000,
  ignoreTrailingSlash: true,
});

server.register(fastifyWebsocket);
server.register(fastifyCors, {
  credentials: true,
  origin: [
    /^http?:\/\/localhost(:\d+)?$/,
    /^http?:\/\/127\.0\.0\.1(:\d+)?$/,
    /^https?:\/\/([a-z0-9-]+\.)*rhiva\.fun$/,
  ],
});

registerRoutes(server);

server.listen({
  host: getEnv<string>("HOST"),
  port: getEnv<number>("PORT", Number),
});

const stop = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("uncaughtException", (err) =>
  server.log.error(err, "Uncaught exception"),
);
process.on("unhandledRejection", (reason, promise) =>
  server.log.error({ promise, reason }, "Unhandled Rejection"),
);
