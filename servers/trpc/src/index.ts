import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyWebsocket from "@fastify/websocket";
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from "@trpc/server/adapters/fastify";

import { createContext } from "./context";
import { appRouter, type AppRouter } from "./routes";
import { getEnv } from "./env";

const server = fastify({
  logger: true,
  maxParamLength: 5000,
});

server.register(fastifyWebsocket);
server.register(fastifyCors, { origin: true, credentials: true });

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
