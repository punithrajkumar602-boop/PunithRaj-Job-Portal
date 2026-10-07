import { one, run, now } from "./database";
import { stripHtml } from "./domain";
export async function aggregate() {
  const stamp = Date.now();
  const lock = await run(
    "INSERT INTO settings(key,value) VALUES ('scrape_lock',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(settings.value AS INTEGER) < ?",
    String(stamp),
    stamp - 21600000,
  );
  if (!lock.meta.changes)
    return {
      jobs_added: 0,
      duplicates_skipped: 0,
      errors: ["Aggregation is limited to once every six hours."],
      cooldown: true,
    };
  let added = 0,
    duplicates = 0;
  const errors: string[] = [];
  try {
    const response = await fetch(
      "https://remotive.com/api/remote-jobs?limit=50",
      {
        signal: AbortSignal.timeout(15000),
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Talentlane/1.0 (public job aggregation; attribution included)",
        },
      },
    );
    if (!response.ok)
      throw new Error(`Source returned HTTP ${response.status}`);
    const data = (await response.json()) as {
      jobs?: {
        id: number;
        title: string;
        company_name: string;
        url: string;
        candidate_required_location?: string;
        job_type?: string;
        salary?: string;
        tags?: string[];
        description?: string;
        publication_date?: string;
      }[];
    };
    if (!Array.isArray(data.jobs))
      throw new Error("Source returned an invalid feed");
    for (const item of data.jobs.slice(0, 50)) {
      try {
        if (
          !item.id ||
          !item.title ||
          !item.company_name ||
          !/^https:\/\/(?:www\.)?remotive\.com\//.test(item.url || "")
        )
          throw new Error("Listing has missing or invalid fields");
        if (
          await one(
            "SELECT id FROM jobs WHERE source_key=?",
            `remotive:${item.id}`,
          )
        ) {
          duplicates++;
          continue;
        }
        const normalized = item.company_name.trim().toLowerCase();
        let company: { id: string } | null = await one(
          "SELECT id FROM companies WHERE lower(name)=?",
          normalized,
        );
        if (!company) {
          company = { id: crypto.randomUUID() };
          await run(
            "INSERT INTO companies(id,name,created_at) VALUES (?,?,?)",
            company.id,
            item.company_name,
            now(),
          );
        }
        const result = await run(
          "INSERT OR IGNORE INTO jobs(id,company_id,title,location,work_mode,employment_type,salary,experience,skills,description,benefits,source,source_url,source_key,posted_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
          crypto.randomUUID(),
          company.id,
          String(item.title).slice(0, 150),
          String(item.candidate_required_location || "Anywhere").slice(0, 150),
          "Remote",
          item.job_type === "contract"
            ? "Contract"
            : item.job_type === "part_time"
              ? "Part-time"
              : "Full-time",
          String(item.salary || "Not disclosed").slice(0, 100),
          "Not specified",
          JSON.stringify(
            (item.tags || [])
              .filter((x: unknown) => typeof x === "string")
              .slice(0, 30),
          ),
          stripHtml(String(item.description || "")).slice(0, 30000),
          "",
          "Remotive",
          item.url,
          `remotive:${item.id}`,
          item.publication_date || now(),
          now(),
        );
        if (result.meta.changes) added++;
        else duplicates++;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Invalid listing");
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Source unavailable");
  }
  await run(
    "INSERT INTO scrape_runs(id,added,duplicates,errors,created_at) VALUES (?,?,?,?,?)",
    crypto.randomUUID(),
    added,
    duplicates,
    JSON.stringify(errors),
    now(),
  );
  return { jobs_added: added, duplicates_skipped: duplicates, errors };
}
