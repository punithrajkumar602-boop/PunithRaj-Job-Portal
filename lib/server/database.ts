import { env } from "cloudflare:workers";
export interface DbRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  company_id: string | null;
  skills: string;
  bio: string;
  resume_url: string;
  value: string;
  count: number;
  n: number;
  job_id: string;
  candidate_id: string;
  employer_id: string;
  source_url: string | null;
  source: string;
  status: string;
  deadline: string | null;
  [column: string]: string | number | null;
}
export function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}
export async function rows(sql: string, ...args: unknown[]) {
  return (
    await db()
      .prepare(sql)
      .bind(...args)
      .all()
  ).results as DbRow[];
}
export async function one(sql: string, ...args: unknown[]) {
  return (await rows(sql, ...args))[0] || null;
}
export async function run(sql: string, ...args: unknown[]) {
  return db()
    .prepare(sql)
    .bind(...args)
    .run();
}
export function jobRow(j: DbRow) {
  return { ...j, skills: JSON.parse(j.skills || "[]") };
}
export function publicUser(u: DbRow) {
  const { password, ...rest } = u;
  void password;
  return { ...rest, skills: JSON.parse(u.skills || "[]") };
}
export const now = () => new Date().toISOString();
