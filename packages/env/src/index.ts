import path from "path";
import dotenv from "dotenv";
import { readFileSync, writeFileSync } from "fs";

const __srcdir = process.cwd();
dotenv.config({ path: path.resolve(__srcdir, ".env") });

export function writeEnvTypes() {
  const envKeys = Object.keys(process.env);
  const template = readFileSync(
    path.resolve(__dirname, "templates/env.txt"),
    "utf-8",
  );
  const search = /^APP_/;

  writeFileSync(
    path.resolve(__srcdir, "src/env.ts"),
    template.replace(
      "%env%",
      envKeys
        .filter((key) => search.test(key))
        .map((key) => `"${key.replace(search, "")}"`)
        .join("|"),
    ),
  );
}
