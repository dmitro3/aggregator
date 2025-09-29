import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyWebsocket from "@fastify/websocket";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";

import { getEnv } from "./env";
import { redis } from "./instances";
import { createContext } from "./context";
import { appRouter, type AppRouter } from "./routes";

const server = fastify({
  logger: true,
  maxParamLength: 5000,
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
server.register(fastifyRateLimit, { redis });
server.register(fastifyTRPCPlugin, {
  prefix: "/",
  useWSS: true,
  trpcOptions: {
    createContext,
    router: appRouter,
    onError({ path, error }) {
      server.log.error(error, path);
    },
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"],
});

server.listen({
  port: getEnv<number>("PORT", Number),
  host: getEnv<string>("HOST"),
});
