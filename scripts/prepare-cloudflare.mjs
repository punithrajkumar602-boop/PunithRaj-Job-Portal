import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const databaseId = process.env.D1_DATABASE_ID;
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId || "") || databaseId === "00000000-0000-4000-8000-000000000000") {
  throw new Error("Set D1_DATABASE_ID to the real D1 database ID from your Cloudflare dashboard.");
}
const path = resolve("dist/server/wrangler.json");
const config = JSON.parse(await readFile(path, "utf8"));
config.name = "punithraj-job-portal";
config.topLevelName = config.name;
config.workers_dev = true;
config.d1_databases = [{
  binding: "DB",
  database_name: "punithraj-job-portal-db",
  database_id: databaseId,
  migrations_dir: "../../drizzle"
}];
config.vars = {
  ...config.vars,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "punithrajkumar602@gmail.com",
  ADMIN_CREDENTIAL_REVISION: process.env.ADMIN_CREDENTIAL_REVISION || "1"
};
await writeFile(path, JSON.stringify(config, null, 2) + "\n");
console.log("Prepared compiled Worker for punithraj-job-portal with D1 binding DB.");
