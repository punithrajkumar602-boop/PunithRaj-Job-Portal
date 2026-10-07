import { z } from "zod";
import type { DbRow } from "../../../lib/server/database";
import {
  db,
  one,
  rows,
  run,
  jobRow,
  publicUser,
  now,
} from "../../../lib/server/database";
import { initialize } from "../../../lib/server/seed";
import {
  hashPassword,
  verifyPassword,
  signJwt,
  verifyJwt,
} from "../../../lib/server/crypto";
import {
  registerSchema,
  jobSchema,
  pagination,
  skillMatch,
} from "../../../lib/server/domain";
import { aggregate } from "../../../lib/server/aggregation";
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const fail = (status: number, message: string): never => {
  throw new HttpError(status, message);
};
async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 100000)
    fail(413, "Request is too large");
  try {
    return await req.json();
  } catch {
    fail(400, "Invalid JSON body");
  }
}
const queryJob =
  "SELECT j.*, c.name AS company FROM jobs j JOIN companies c ON c.id=j.company_id";
async function handler(req: Request) {
  try {
    await initialize();
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\//, "").split("/");
    const method = req.method;
    if (method !== "GET" && method !== "HEAD") {
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) fail(403, "Origin is not allowed");
      const ip = req.headers.get("cf-connecting-ip") || "local";
      const window = Math.floor(Date.now() / 60000);
      const k = `${ip}:${window}:${path[0] === "auth" ? "auth" : "write"}`;
      await run(
        "INSERT INTO rate_limits(key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
        k,
        Date.now() + 120000,
      );
      const limit = path[0] === "auth" ? 15 : 90;
      if (
        (await one("SELECT count FROM rate_limits WHERE key=?", k)).count >
        limit
      )
        fail(429, "Too many requests. Try again in one minute.");
      await run("DELETE FROM rate_limits WHERE expires<?", Date.now());
    }
    const secret = (
      await one("SELECT value FROM settings WHERE key='jwt_secret'")
    ).value;
    const bearer = req.headers.get("authorization")?.replace(/^Bearer /, "");
    const cookie = req.headers
      .get("cookie")
      ?.split("; ")
      .find((x) => x.startsWith("talentlane_token="))
      ?.slice(17);
    const uid = await verifyJwt(bearer || cookie || "", secret);
    const user = uid ? await one("SELECT * FROM users WHERE id=?", uid) : null;
    function requireRole(...roles: string[]): DbRow {
      if (!user) throw new HttpError(401, "Sign in to continue");
      if (roles.length && !roles.includes(user.role))
        throw new HttpError(
          403,
          "You do not have permission to perform this action",
        );
      return user;
    }
    function json(
      data: unknown,
      status = 200,
      headers: Record<string, string> = {},
    ) {
      return Response.json(data, {
        status,
        headers: { "Cache-Control": "no-store", ...headers },
      });
    }
    if (path[0] === "auth") {
      if (path[1] === "register" && method === "POST") {
        const p = registerSchema.parse(await body(req));
        if (await one("SELECT id FROM users WHERE email=?", p.email))
          fail(409, "An account with this email already exists");
        const id = crypto.randomUUID();
        const companyId = p.role === "employer" ? crypto.randomUUID() : null;
        const statements = [];
        if (companyId)
          statements.push(
            db()
              .prepare(
                "INSERT INTO companies(id,name,created_at) VALUES (?,?,?)",
              )
              .bind(companyId, p.company, now()),
          );
        statements.push(
          db()
            .prepare(
              "INSERT INTO users(id,name,email,password,role,company_id,created_at) VALUES (?,?,?,?,?,?,?)",
            )
            .bind(
              id,
              p.name,
              p.email,
              await hashPassword(p.password),
              p.role,
              companyId,
              now(),
            ),
        );
        await db().batch(statements);
        const token = await signJwt(id, secret);
        return json(
          {
            user: publicUser(await one("SELECT * FROM users WHERE id=?", id)),
            token,
          },
          201,
          {
            "Set-Cookie": `talentlane_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`,
          },
        );
      }
      if (path[1] === "login" && method === "POST") {
        const p = z
          .object({
            email: z.string().email(),
            password: z.string().min(1).max(128),
          })
          .parse(await body(req));
        const u = await one(
          "SELECT * FROM users WHERE email=?",
          p.email.toLowerCase(),
        );
        if (!u || !(await verifyPassword(p.password, u.password)))
          fail(401, "Email or password is incorrect");
        const token = await signJwt(u.id, secret);
        return json({ user: publicUser(u), token }, 200, {
          "Set-Cookie": `talentlane_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${url.protocol === "https:" ? "; Secure" : ""}`,
        });
      }
      if (path[1] === "logout" && method === "POST")
        return json({ ok: true }, 200, {
          "Set-Cookie":
            "talentlane_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
        });
      if (path[1] === "me" && method === "GET")
        return json({ user: user ? publicUser(user) : null });
    }
    if (path[0] === "profile") {
      const u = requireRole();
      if (method === "GET") return json({ user: publicUser(u) });
      if (method === "PUT") {
        const p = z
          .object({
            name: z.string().trim().min(2).max(80),
            skills: z.array(z.string().trim().min(1).max(50)).max(30),
            bio: z.string().max(3000),
            resume_url: z.union([
              z.literal(""),
              z
                .string()
                .url()
                .refine((s) => s.startsWith("https://"), "Use an HTTPS link"),
            ]),
          })
          .parse(await body(req));
        await run(
          "UPDATE users SET name=?,skills=?,bio=?,resume_url=? WHERE id=?",
          p.name,
          JSON.stringify(p.skills),
          p.bio,
          p.resume_url,
          u.id,
        );
        return json({
          user: publicUser(await one("SELECT * FROM users WHERE id=?", u.id)),
        });
      }
    }
    if (path[0] === "jobs") {
      if (!path[1] && method === "GET") {
        const { page, limit, offset } = pagination(url.searchParams);
        const conditions = ["j.status=?"];
        const args: unknown[] = ["open"];
        if (url.searchParams.get("owned") === "1") {
          const u = requireRole("employer", "admin");
          conditions.length = 0;
          args.length = 0;
          conditions.push("j.employer_id=?");
          args.push(u.id);
        }
        for (const [param, col] of [
          ["mode", "work_mode"],
          ["type", "employment_type"],
          ["location", "location"],
        ]) {
          const v = url.searchParams.get(param);
          if (v) {
            conditions.push(`j.${col} LIKE ?`);
            args.push(`%${v}%`);
          }
        }
        const q = url.searchParams.get("q");
        if (q) {
          conditions.push(
            "(j.title LIKE ? OR c.name LIKE ? OR j.skills LIKE ? OR j.description LIKE ?)",
          );
          args.push(...Array(4).fill(`%${q.slice(0, 150)}%`));
        }
        if (url.searchParams.get("saved") === "1") {
          const u = requireRole("candidate");
          conditions.push(
            "j.id IN (SELECT job_id FROM saved_jobs WHERE user_id=?)",
          );
          args.push(u.id);
        }
        const where = conditions.length
          ? " WHERE " + conditions.join(" AND ")
          : "";
        const sort =
          url.searchParams.get("sort") === "oldest"
            ? "j.posted_at ASC"
            : url.searchParams.get("sort") === "title"
              ? "j.title ASC"
              : "j.posted_at DESC";
        const total = (
          await one(
            "SELECT count(*) AS n FROM jobs j JOIN companies c ON c.id=j.company_id" +
              where,
            ...args,
          )
        ).n;
        const list = await rows(
          queryJob + where + ` ORDER BY ${sort},j.id LIMIT ? OFFSET ?`,
          ...args,
          limit,
          offset,
        );
        const saved = user
          ? await rows("SELECT job_id FROM saved_jobs WHERE user_id=?", user.id)
          : [];
        return json({
          jobs: list.map((j) => ({
            ...jobRow(j),
            saved: saved.some((s) => s.job_id === j.id),
          })),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      }
      if (!path[1] && method === "POST") {
        const u = requireRole("employer");
        const p = jobSchema.parse(await body(req));
        const id = crypto.randomUUID();
        await run(
          "INSERT INTO jobs(id,employer_id,company_id,title,location,work_mode,employment_type,salary,experience,skills,description,benefits,deadline,status,posted_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          id,
          u.id,
          u.company_id,
          p.title,
          p.location,
          p.work_mode,
          p.employment_type,
          p.salary,
          p.experience,
          JSON.stringify(p.skills),
          p.description,
          p.benefits,
          p.deadline || null,
          p.status,
          now(),
          now(),
        );
        return json(
          { job: jobRow(await one(queryJob + " WHERE j.id=?", id)) },
          201,
        );
      }
      if (path[1]) {
        const job = await one(queryJob + " WHERE j.id=?", path[1]);
        if (!job) fail(404, "Job not found");
        if (!path[2] && method === "GET") {
          const saved = user
            ? !!(await one(
                "SELECT id FROM saved_jobs WHERE job_id=? AND user_id=?",
                job.id,
                user.id,
              ))
            : false;
          const applied = user
            ? !!(await one(
                "SELECT id FROM applications WHERE job_id=? AND candidate_id=?",
                job.id,
                user.id,
              ))
            : false;
          return json({ job: { ...jobRow(job), saved, applied } });
        }
        if (!path[2] && (method === "PUT" || method === "DELETE")) {
          const u = requireRole("employer", "admin");
          if (u.role !== "admin" && job.employer_id !== u.id)
            fail(403, "You can only manage your own jobs");
          if (method === "DELETE") {
            await run("DELETE FROM jobs WHERE id=?", job.id);
            return json({ ok: true });
          }
          const p = jobSchema.parse(await body(req));
          await run(
            "UPDATE jobs SET title=?,location=?,work_mode=?,employment_type=?,salary=?,experience=?,skills=?,description=?,benefits=?,deadline=?,status=? WHERE id=?",
            p.title,
            p.location,
            p.work_mode,
            p.employment_type,
            p.salary,
            p.experience,
            JSON.stringify(p.skills),
            p.description,
            p.benefits,
            p.deadline || null,
            p.status,
            job.id,
          );
          return json({
            job: jobRow(await one(queryJob + " WHERE j.id=?", job.id)),
          });
        }
        if (path[2] === "apply" && method === "POST") {
          const u = requireRole("candidate");
          if (job.source_url)
            fail(400, "Apply at the original source for this job");
          if (job.source === "Sample listing")
            fail(400, "Sample listings do not accept real applications");
          if (
            job.status !== "open" ||
            (job.deadline && job.deadline < now().slice(0, 10))
          )
            fail(409, "This job is no longer accepting applications");
          const p = z
            .object({ cover_letter: z.string().max(5000).default("") })
            .parse(await body(req));
          if (
            await one(
              "SELECT id FROM applications WHERE job_id=? AND candidate_id=?",
              job.id,
              u.id,
            )
          )
            fail(409, "You have already applied");
          await run(
            "INSERT INTO applications(id,job_id,candidate_id,cover_letter,created_at) VALUES (?,?,?,?,?)",
            crypto.randomUUID(),
            job.id,
            u.id,
            p.cover_letter,
            now(),
          );
          return json({ ok: true }, 201);
        }
        if (path[2] === "save" && (method === "POST" || method === "DELETE")) {
          const u = requireRole("candidate");
          if (method === "POST")
            await run(
              "INSERT OR IGNORE INTO saved_jobs(id,job_id,user_id,created_at) VALUES (?,?,?,?)",
              crypto.randomUUID(),
              job.id,
              u.id,
              now(),
            );
          else
            await run(
              "DELETE FROM saved_jobs WHERE job_id=? AND user_id=?",
              job.id,
              u.id,
            );
          return json({ saved: method === "POST" });
        }
        if (path[2] === "match" && method === "GET") {
          const u = requireRole("candidate");
          return json(skillMatch(JSON.parse(u.skills), JSON.parse(job.skills)));
        }
      }
    }
    if (path[0] === "applications") {
      const u = requireRole();
      if (path[1] && method === "PUT") {
        requireRole("employer", "admin");
        const a = await one(
          "SELECT a.*,j.employer_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?",
          path[1],
        );
        if (!a) fail(404, "Application not found");
        if (u.role !== "admin" && a.employer_id !== u.id)
          fail(403, "Not your applicant");
        const p = z
          .object({
            status: z.enum([
              "submitted",
              "reviewing",
              "shortlisted",
              "rejected",
            ]),
          })
          .parse(await body(req));
        await run(
          "UPDATE applications SET status=? WHERE id=?",
          p.status,
          a.id,
        );
        return json({ ok: true });
      }
      if (method === "GET") {
        const { page, limit, offset } = pagination(url.searchParams);
        const where =
          u.role === "candidate"
            ? "a.candidate_id=?"
            : u.role === "employer"
              ? "j.employer_id=?"
              : "1=1";
        const args = u.role === "admin" ? [] : [u.id];
        const base =
          " FROM applications a JOIN jobs j ON j.id=a.job_id JOIN companies c ON c.id=j.company_id JOIN users u ON u.id=a.candidate_id WHERE " +
          where;
        const total = (await one("SELECT count(*) n" + base, ...args)).n;
        return json({
          applications: await rows(
            "SELECT a.*,j.title,c.name company,u.name candidate,u.email,u.resume_url,u.skills" +
              base +
              " ORDER BY a.created_at DESC LIMIT ? OFFSET ?",
            ...args,
            limit,
            offset,
          ),
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
      }
    }
    if (path[0] === "dashboard" && method === "GET") {
      const u = requireRole();
      if (u.role === "admin") {
        const counts = await one(
          "SELECT (SELECT count(*) FROM users) users,(SELECT count(*) FROM jobs) jobs,(SELECT count(*) FROM companies) companies,(SELECT count(*) FROM applications) applications,(SELECT count(*) FROM jobs WHERE source='Remotive' AND substr(created_at,1,10)=?) scraped_today",
          now().slice(0, 10),
        );
        const all = await rows("SELECT skills FROM jobs");
        const skills: Record<string, number> = Object.create(null);
        for (const j of all)
          for (const s of JSON.parse(j.skills))
            skills[s] = (skills[s] || 0) + 1;
        return json({
          role: u.role,
          counts,
          top_skills: Object.entries(skills)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name, count })),
          top_companies: await rows(
            "SELECT c.name,count(*) count FROM jobs j JOIN companies c ON c.id=j.company_id GROUP BY c.id ORDER BY count DESC LIMIT 6",
          ),
          top_locations: await rows(
            "SELECT location name,count(*) count FROM jobs GROUP BY location ORDER BY count DESC LIMIT 6",
          ),
          scrape_runs: await rows(
            "SELECT * FROM scrape_runs ORDER BY created_at DESC LIMIT 8",
          ),
        });
      }
      if (u.role === "employer")
        return json({
          role: u.role,
          counts: await one(
            "SELECT (SELECT count(*) FROM jobs WHERE employer_id=?) jobs,(SELECT count(*) FROM jobs WHERE employer_id=? AND status='open') open,(SELECT count(*) FROM applications a JOIN jobs j ON a.job_id=j.id WHERE j.employer_id=?) applications",
            u.id,
            u.id,
            u.id,
          ),
        });
      return json({
        role: u.role,
        counts: await one(
          "SELECT (SELECT count(*) FROM applications WHERE candidate_id=?) applications,(SELECT count(*) FROM saved_jobs WHERE user_id=?) saved,(SELECT count(*) FROM applications WHERE candidate_id=? AND status='shortlisted') shortlisted",
          u.id,
          u.id,
          u.id,
        ),
      });
    }
    if (path[0] === "scrape" && path[1] === "jobs" && method === "POST") {
      requireRole("admin");
      const result = await aggregate();
      return json(result, result.cooldown ? 429 : 200);
    }
    fail(404, "Endpoint not found");
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        { error: "Validation failed", details: e.flatten() },
        { status: 422 },
      );
    if (e instanceof HttpError)
      return Response.json({ error: e.message }, { status: e.status });
    console.error("API failure", e);
    if (String(e).includes("UNIQUE constraint"))
      return Response.json(
        { error: "This record already exists" },
        { status: 409 },
      );
    return Response.json(
      { error: "Service unavailable. Please try again." },
      { status: 503 },
    );
  }
}
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
