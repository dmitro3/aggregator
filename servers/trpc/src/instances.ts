import { createDB } from "@rhiva-ag/datasource";
import { getEnv } from "./env";

export const db = createDB(getEnv("DATABASE_URL"));
