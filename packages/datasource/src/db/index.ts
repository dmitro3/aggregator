import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema";

export * from "./zod";
export * from "./schema";
export * from "./custom-drizzle";

export const createDB = (url: string) => drizzle(url, { schema });
export type Database = ReturnType<typeof createDB>;
