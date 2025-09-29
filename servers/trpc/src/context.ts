import { connection, db } from "./instances";

export const createContext = async () => {
  return {
    drizzle: db,
    solanaConnection: connection,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
