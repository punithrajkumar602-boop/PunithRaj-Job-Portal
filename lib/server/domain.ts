import { z } from "zod";
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z
      .string()
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(10).max(128),
    role: z.enum(["candidate", "employer"]),
    company: z.string().trim().min(2).max(100).optional(),
  })
  .refine((x) => x.role !== "employer" || !!x.company, {
    message: "Company is required",
    path: ["company"],
  });
export const jobSchema = z.object({
  title: z.string().trim().min(3).max(150),
  location: z.string().trim().min(2).max(150),
  work_mode: z.enum(["Remote", "Hybrid", "On-site"]),
  employment_type: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  salary: z.string().trim().max(100).default("Not disclosed"),
  experience: z.string().trim().max(100).default("Not specified"),
  skills: z.array(z.string().trim().min(1).max(50)).max(30),
  description: z.string().trim().min(30).max(30000),
  benefits: z.string().max(5000).default(""),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["open", "closed"]).default("open"),
});
export function pagination(params: URLSearchParams) {
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const limit = Math.max(1, Math.min(50, Number(params.get("limit")) || 9));
  return {
    page: Math.floor(page),
    limit: Math.floor(limit),
    offset: (Math.floor(page) - 1) * Math.floor(limit),
  };
}
export function stripHtml(s: string) {
  return s
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
export function skillMatch(profile: string[], required: string[]) {
  const p = new Set(profile.map((x) => x.toLowerCase().trim()));
  const matched = required.filter((x) => p.has(x.toLowerCase().trim()));
  return {
    score: required.length
      ? Math.round((matched.length / required.length) * 100)
      : 0,
    matched,
    missing: required.filter((x) => !p.has(x.toLowerCase().trim())),
    method: "Deterministic skill overlap; not an AI assessment",
  };
}
