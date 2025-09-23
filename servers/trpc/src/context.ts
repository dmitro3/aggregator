import { db } from "./instances";

export const createContext = async () => {
  return {
    drizzle: db,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;
