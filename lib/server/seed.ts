import { db, one, now, run } from "./database";
import { hashPassword, b64 } from "./crypto";
export async function initialize() {
  await db().batch(
    ["admin", "employer", "candidate"].map((r) =>
      db().prepare("INSERT OR IGNORE INTO roles(name) VALUES (?)").bind(r),
    ),
  );
  await run(
    "INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)",
    "jwt_secret",
    b64(crypto.getRandomValues(new Uint8Array(32))),
  );
  await syncConfiguredAdmin();
  if (await one("SELECT value FROM settings WHERE key='seeded'")) return;
  const companies = [
    ["c-linear", "Linear"],
    ["c-vercel", "Vercel"],
    ["c-notion", "Notion"],
    ["c-stripe", "Stripe"],
    ["c-figma", "Figma"],
    ["c-razorpay", "Razorpay"],
  ];
  await db().batch(
    companies.map(([id, name]) =>
      db()
        .prepare(
          "INSERT OR IGNORE INTO companies(id,name,created_at) VALUES (?,?,?)",
        )
        .bind(id, name, now()),
    ),
  );
  const samples = [
    [
      "j-1",
      "c-linear",
      "Senior Frontend Engineer",
      "Bengaluru, India",
      "Remote",
      "Full-time",
      "₹28–42 LPA",
      "4–7 years",
      ["React", "TypeScript", "CSS"],
      "Build thoughtful, fast interfaces for a collaborative product. You will own features from design through delivery, work closely with product designers, and improve performance and accessibility across the application. We value clear communication, a strong understanding of the web platform, and craft in every detail.",
      "Flexible hours, learning budget, health insurance",
      2,
    ],
    [
      "j-2",
      "c-vercel",
      "Full Stack Developer",
      "Anywhere",
      "Remote",
      "Full-time",
      "$110k–160k / year",
      "3–5 years",
      ["Next.js", "Node.js", "PostgreSQL"],
      "Help developers ship better experiences. Build full stack applications, maintain reliable APIs, and contribute to a modern development platform. You will collaborate across engineering and product, write maintainable code, and take ownership of production reliability.",
      "Remote work, equipment stipend, paid time off",
      1,
    ],
    [
      "j-3",
      "c-notion",
      "Product Designer",
      "Bengaluru, India",
      "Hybrid",
      "Full-time",
      "₹20–32 LPA",
      "3–6 years",
      ["Figma", "Prototyping", "Design systems"],
      "Create intuitive tools that help teams organize their work. Partner with engineers to develop and test product ideas, conduct user research, and bring clarity to complex interactions. Your portfolio should demonstrate thoughtful systems thinking and excellent visual craft.",
      "Health coverage, team retreats, learning allowance",
      3,
    ],
    [
      "j-4",
      "c-stripe",
      "Backend Engineer",
      "Hyderabad, India",
      "Hybrid",
      "Full-time",
      "₹32–50 LPA",
      "4–8 years",
      ["Python", "PostgreSQL", "APIs"],
      "Design reliable services for a payments platform. Build APIs, optimize databases, and work on systems that handle complex financial workflows. You will review architectural decisions, monitor production services, and collaborate with a team that values correctness and maintainability.",
      "Medical insurance, parental leave, stock options",
      1,
    ],
    [
      "j-5",
      "c-figma",
      "Design Systems Engineer",
      "Anywhere",
      "Remote",
      "Contract",
      "$80–110 / hour",
      "3–5 years",
      ["React", "TypeScript", "Accessibility"],
      "Bring design and engineering together. Build reusable components, document patterns, and make interfaces accessible across devices. Work with designers and developers to improve a shared component library and deliver robust interactive experiences.",
      "Flexible schedule, distributed team",
      5,
    ],
    [
      "j-6",
      "c-razorpay",
      "Machine Learning Engineer",
      "Bengaluru, India",
      "On-site",
      "Full-time",
      "₹24–38 LPA",
      "2–5 years",
      ["Python", "PyTorch", "SQL"],
      "Develop machine learning models and reliable inference pipelines. Turn data into useful product capabilities, evaluate model quality, and collaborate with platform engineers to deploy and monitor experiments. You will balance research with practical engineering delivery.",
      "Learning budget, meals, health insurance",
      4,
    ],
    [
      "j-7",
      "c-linear",
      "Engineering Intern",
      "Anywhere",
      "Remote",
      "Internship",
      "₹40k–60k / month",
      "0–1 years",
      ["JavaScript", "React", "Git"],
      "Learn alongside experienced engineers while contributing to real product features. You will implement interfaces, debug issues, and participate in code reviews. This role is designed for curious builders with a strong foundation in JavaScript and a willingness to learn.",
      "Mentorship, flexible hours",
      6,
    ],
    [
      "j-8",
      "c-vercel",
      "DevOps Engineer",
      "Pune, India",
      "Hybrid",
      "Full-time",
      "₹22–36 LPA",
      "3–6 years",
      ["Docker", "AWS", "CI/CD"],
      "Build infrastructure that teams can trust. Automate deployments, monitor services, and improve incident response. Work with developers to strengthen operational practices and make systems more secure, observable, and resilient.",
      "Health insurance, certification budget",
      2,
    ],
    [
      "j-9",
      "c-stripe",
      "Data Analyst",
      "Mumbai, India",
      "Hybrid",
      "Part-time",
      "₹8–14 LPA",
      "1–3 years",
      ["SQL", "Python", "Analytics"],
      "Help product teams make informed decisions. Create reliable datasets, build clear dashboards, and explain trends to stakeholders. You will work closely with engineering and operations to define metrics and improve data quality.",
      "Flexible work, learning budget",
      7,
    ],
  ];
  await db().batch(
    samples.map((x) => {
      const [
        id,
        company,
        title,
        location,
        mode,
        type,
        salary,
        experience,
        skills,
        description,
        benefits,
        days,
      ] = x;
      return db()
        .prepare(
          "INSERT OR IGNORE INTO jobs(id,company_id,title,location,work_mode,employment_type,salary,experience,skills,description,benefits,source,posted_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          company,
          title,
          location,
          mode,
          type,
          salary,
          experience,
          JSON.stringify(skills),
          description,
          benefits,
          "Sample listing",
          new Date(Date.now() - Number(days) * 86400000).toISOString(),
          now(),
        );
    }),
  );
  await run(
    "INSERT OR IGNORE INTO settings(key,value) VALUES (?,?)",
    "seeded",
    "1",
  );
}

// Explicitly versioned runtime credentials can update an already seeded account.
// Passwords stay in runtime secrets; only salted hashes enter the database.
async function syncConfiguredAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const revision = process.env.ADMIN_CREDENTIAL_REVISION || "1";
  if (!email || !password) return;
  const applied = await one(
    "SELECT value FROM settings WHERE key=?",
    "admin_credential_revision",
  );
  if (applied?.value === revision) return;
  const existing = await one("SELECT id FROM users WHERE id=?", "admin");
  const passwordHash = await hashPassword(password);
  const statements = [
    db()
      .prepare(
        "INSERT INTO users(id,name,email,password,role,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,password=excluded.password,role=excluded.role",
      )
      .bind("admin", "Portal Admin", email, passwordHash, "admin", now()),
    db()
      .prepare(
        "INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .bind("admin_credential_revision", revision),
  ];
  if (existing)
    statements.push(
      db()
        .prepare("UPDATE settings SET value=? WHERE key=?")
        .bind(b64(crypto.getRandomValues(new Uint8Array(32))), "jwt_secret"),
    );
  await db().batch(statements);
}
