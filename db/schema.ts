import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const roles = sqliteTable("roles", { name: text("name").primaryKey() });
export const companies = sqliteTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  website: text("website").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role")
    .notNull()
    .references(() => roles.name),
  companyId: text("company_id").references(() => companies.id),
  skills: text("skills").notNull().default("[]"),
  bio: text("bio").notNull().default(""),
  resumeUrl: text("resume_url").notNull().default(""),
  createdAt: text("created_at").notNull(),
});
export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(),
    employerId: text("employer_id").references(() => users.id),
    companyId: text("company_id")
      .notNull()
      .references(() => companies.id),
    title: text("title").notNull(),
    location: text("location").notNull(),
    workMode: text("work_mode").notNull(),
    employmentType: text("employment_type").notNull(),
    salary: text("salary").notNull(),
    experience: text("experience").notNull(),
    skills: text("skills").notNull(),
    description: text("description").notNull(),
    benefits: text("benefits").notNull(),
    deadline: text("deadline"),
    status: text("status").notNull().default("open"),
    source: text("source").notNull().default("Talentlane"),
    sourceUrl: text("source_url"),
    sourceKey: text("source_key").unique(),
    postedAt: text("posted_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("jobs_search").on(t.status, t.workMode, t.employmentType),
    index("jobs_employer").on(t.employerId),
    index("jobs_date").on(t.postedAt),
    index("jobs_company").on(t.companyId),
  ],
);
export const applications = sqliteTable(
  "applications",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => users.id),
    coverLetter: text("cover_letter").notNull().default(""),
    status: text("status").notNull().default("submitted"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("application_once").on(t.jobId, t.candidateId),
    index("application_candidate").on(t.candidateId),
  ],
);
export const savedJobs = sqliteTable(
  "saved_jobs",
  {
    id: text("id").primaryKey(),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("saved_once").on(t.jobId, t.userId)],
);
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expires: integer("expires").notNull(),
});
export const scrapeRuns = sqliteTable("scrape_runs", {
  id: text("id").primaryKey(),
  added: integer("added").notNull(),
  duplicates: integer("duplicates").notNull(),
  errors: text("errors").notNull(),
  createdAt: text("created_at").notNull(),
});
