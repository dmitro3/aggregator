import { createDB } from "@rhiva-ag/datasource";

export const db = createDB(process.env.DATABASE_URL!);
