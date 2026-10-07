import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { Miniflare } = createRequire(require.resolve("wrangler/package.json"))(
  "miniflare",
);
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { suite } from "./integration.mjs";
const root = new URL("../", import.meta.url).pathname.replace(/\/$/, "");
async function modules(dir) {
  const list = [];
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, f.name);
    if (f.isDirectory()) list.push(...(await modules(path)));
    else if (path.endsWith(".js")) list.push({ type: "ESModule", path });
  }
  return list;
}
const files = await modules(root + "/dist/server");
const all = [
  {
    type: "ESModule",
    path: root + "/dist/server/test-entry.js",
    contents: "import worker from './index.js'; export default worker;",
  },
  ...files,
];
const mf = new Miniflare({
  modules: all,
  modulesRoot: root + "/dist/server",
  compatibilityDate: "2026-05-15",
  compatibilityFlags: ["nodejs_compat"],
  d1Databases: { DB: "test-db" },
  outboundService: async () =>
    Response.json({
      jobs: [
        {
          id: 123,
          title: "Feed Engineer",
          company_name: "Feed Company",
          url: "https://remotive.com/remote-jobs/software-dev/feed-123",
          tags: ["React"],
          description: "<p>A permitted public source example.</p>",
          publication_date: "2026-10-07",
        },
        {
          id: 123,
          title: "Feed Engineer",
          company_name: "Feed Company",
          url: "https://remotive.com/remote-jobs/software-dev/feed-123",
        },
        {
          id: 456,
          title: "Invalid source",
          company_name: "Feed Company",
          url: "javascript:alert(1)",
        },
      ],
    }),
  bindings: {
    ADMIN_EMAIL: "admin-test@example.com",
    ADMIN_PASSWORD: "test-admin-password-123",
  },
});
try {
  const database = await mf.getD1Database("DB");
  const sql = await readFile(
    root + "/drizzle/0000_volatile_lady_deathstrike.sql",
    "utf8",
  );
  for (const statement of sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean))
    await database.prepare(statement).run();
  await suite((url, options) => mf.dispatchFetch(url, options));
  // Simulate a prior admin account in an already seeded database.
  await database
    .prepare("UPDATE users SET email=?,password=? WHERE id='admin'")
    .bind("obsolete-admin@example.com", "obsolete-hash")
    .run();
  await database
    .prepare("DELETE FROM settings WHERE key='admin_credential_revision'")
    .run();
  const r = await mf.dispatchFetch("http://localhost:4173/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "admin-test@example.com",
      password: "test-admin-password-123",
    }),
  });
  const d = await r.json();
  if (r.status !== 200) throw new Error(JSON.stringify(d));
  const dashboard = await mf.dispatchFetch(
    "http://localhost:4173/api/dashboard",
    { headers: { authorization: "Bearer " + d.token } },
  );
  const stats = await dashboard.json();
  if (dashboard.status !== 200 || !stats.top_skills.length)
    throw new Error(JSON.stringify(stats));
  console.log("PASS: configured admin bootstrap and live database analytics.");
  const scrape = await mf.dispatchFetch(
    "http://localhost:4173/api/scrape/jobs",
    { method: "POST", headers: { authorization: "Bearer " + d.token } },
  );
  const imported = await scrape.json();
  if (
    imported.jobs_added !== 1 ||
    imported.duplicates_skipped !== 1 ||
    imported.errors.length !== 1
  )
    throw new Error(JSON.stringify(imported));
  const cooldown = await mf.dispatchFetch(
    "http://localhost:4173/api/scrape/jobs",
    { method: "POST", headers: { authorization: "Bearer " + d.token } },
  );
  if (cooldown.status !== 429) throw new Error("Missing six-hour cooldown");
  await database
    .prepare("UPDATE settings SET value='0' WHERE key='scrape_lock'")
    .run();
  const repeat = await mf.dispatchFetch(
    "http://localhost:4173/api/scrape/jobs",
    { method: "POST", headers: { authorization: "Bearer " + d.token } },
  );
  const skipped = await repeat.json();
  if (skipped.jobs_added !== 0 || skipped.duplicates_skipped !== 2)
    throw new Error(JSON.stringify(skipped));
  console.log(
    "PASS: feed import, source validation, unique-source deduplication, and six-hour cooldown (stubbed upstream).",
  );
  const page = await mf.dispatchFetch("http://localhost:4173/jobs");
  const html = await page.text();
  if (page.status !== 200 || !html.includes("Find work that"))
    throw new Error("SSR page failed " + page.status);
  console.log("PASS: job board server rendering.");
  for (const [route, heading] of [
    ["/login", "Good to see you again."],
    ["/register", "Make your next move."],
  ]) {
    const response = await mf.dispatchFetch("http://localhost:4173" + route);
    const markup = await response.text();
    if (
      response.status !== 200 ||
      !markup.includes(heading) ||
      !markup.includes('name="email"') ||
      !markup.includes('name="password"')
    )
      throw new Error("Authentication page did not render: " + route);
  }
  console.log(
    "PASS: direct sign-in and registration pages render their forms.",
  );
} catch (e) {
  console.error(e);
  process.exitCode = 1;
} finally {
  await mf.dispose();
}
