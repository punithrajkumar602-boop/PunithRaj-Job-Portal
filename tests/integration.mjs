import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
const base = process.env.BASE_URL || "http://localhost:4173";
export async function suite(fetcher = fetch) {
  async function request(path, method = "GET", body, token, expected = 200) {
    const r = await fetcher(base + "/api/" + path, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    assert.equal(
      r.status,
      expected,
      `${method} ${path}: ${JSON.stringify(data)}`,
    );
    return { data, response: r };
  }
  const nonce = Date.now();
  const title = `Integration Engineer ${nonce}`;
  const emp = await request(
    "auth/register",
    "POST",
    {
      name: "Integration Employer",
      email: `employer${nonce}@example.com`,
      password: "test-password-123",
      role: "employer",
      company: "Integration Co",
    },
    null,
    201,
  );
  const et = emp.data.token;
  const candidate = await request(
    "auth/register",
    "POST",
    {
      name: "Integration Candidate",
      email: `candidate${nonce}@example.com`,
      password: "test-password-123",
      role: "candidate",
    },
    null,
    201,
  );
  const ct = candidate.data.token;
  const outsider = await request(
    "auth/register",
    "POST",
    {
      name: "Other Employer",
      email: `other${nonce}@example.com`,
      password: "test-password-123",
      role: "employer",
      company: "Other Co",
    },
    null,
    201,
  );
  await request(
    "auth/register",
    "POST",
    {
      name: "Bad Admin",
      email: `bad${nonce}@example.com`,
      password: "test-password-123",
      role: "admin",
    },
    null,
    422,
  );
  await request(
    "auth/login",
    "POST",
    { email: `candidate${nonce}@example.com`, password: "bad" },
    null,
    401,
  );
  const login = await request("auth/login", "POST", {
    email: `candidate${nonce}@example.com`,
    password: "test-password-123",
  });
  assert.ok(login.response.headers.get("set-cookie").includes("HttpOnly"));
  await request("auth/me", "GET", undefined, ct + "tampered");
  const j = {
    title,
    location: "Bengaluru",
    work_mode: "Remote",
    employment_type: "Full-time",
    salary: "₹20 LPA",
    experience: "2 years",
    skills: ["React", "SQL"],
    description:
      "Build reliable full stack software alongside a collaborative engineering team.",
    benefits: "Learning budget",
    status: "open",
  };
  await request("jobs", "POST", j, null, 401);
  await request("jobs", "POST", j, ct, 403);
  const created = await request("jobs", "POST", j, et, 201);
  const id = created.data.job.id;
  await request("jobs/" + id, "PUT", j, outsider.data.token, 403);
  const searched = await request(
    `jobs?q=${encodeURIComponent(title)}&mode=Remote&limit=1`,
  );
  assert.equal(searched.data.jobs.length, 1);
  assert.equal(searched.data.pagination.total, 1);
  await request("jobs/" + id + "/save", "POST", undefined, ct);
  await request("jobs/" + id + "/save", "POST", undefined, ct);
  const saved = await request("jobs?saved=1", "GET", undefined, ct);
  assert.equal(saved.data.jobs.length, 1);
  await request(
    "jobs/" + id + "/apply",
    "POST",
    { cover_letter: "I can help build this." },
    ct,
    201,
  );
  await request("jobs/" + id + "/apply", "POST", {}, ct, 409);
  const apps = await request("applications", "GET", undefined, et);
  assert.equal(apps.data.applications.length, 1);
  const appId = apps.data.applications[0].id;
  assert.equal(
    (await request("applications", "GET", undefined, outsider.data.token)).data
      .applications.length,
    0,
  );
  await request("applications/" + appId, "PUT", { status: "shortlisted" }, et);
  assert.equal(
    (await request("dashboard", "GET", undefined, ct)).data.counts.shortlisted,
    1,
  );
  await request("scrape/jobs", "POST", {}, et, 403);
  await request("jobs/" + id, "PUT", { ...j, status: "closed" }, et);
  assert.equal(
    (await request(`jobs?q=${encodeURIComponent(title)}`)).data.pagination.total,
    0,
  );
  await request("jobs/" + id + "/apply", "POST", {}, ct, 409);
  await request("jobs/" + id, "DELETE", undefined, et);
  await request("jobs/" + id, "GET", undefined, null, 404);
  assert.equal(
    (await request("applications", "GET", undefined, ct)).data.applications
      .length,
    0,
  );
  assert.equal(
    (await request("jobs?saved=1", "GET", undefined, ct)).data.jobs.length,
    0,
  );
  console.log(
    "PASS: registration, JWT/cookie login, role/ownership boundaries, search, save idempotency, duplicate applications, employer review, close, and cascading deletion.",
  );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await suite();
