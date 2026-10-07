# PunithRaj - Job Portal

A full stack job portal with candidate and employer accounts, JWT authentication, owned job management, saved jobs, applications, admin analytics, and public job aggregation.

## Live app

https://talentlane-jobs.punithrajkumar602.chatgpt.site

## Stack and deployment tradeoff

- React 19 + TypeScript, Next.js App Router APIs through Vinext, Tailwind CSS.
- REST route handlers on Cloudflare Workers.
- Relational SQLite on Cloudflare D1, Drizzle schema and versioned migrations.
- JWT HS256, PBKDF2-SHA256 password hashing (100,000 iterations and random salt), HttpOnly/SameSite cookies.

The assessment recommends PostgreSQL and Node/Express. The hosted implementation uses D1 and Workers to provide a real persistent full stack deployment in the available environment. This is an explicit stack deviation, not a claim of PostgreSQL support. A PostgreSQL port would replace the database adapter and Drizzle dialect.

## Features

- Candidate / employer registration and login. Admin accounts cannot be registered publicly.
- Candidate: search by text and location, work-mode and employment filters, sorting, pagination, saved jobs, cover-letter applications, application tracking, profile and resume URL.
- Employer: create/edit/delete/close/reopen owned jobs; view applicants, resume links, cover letters and change application status.
- Admin: total users, jobs, companies, applications, scraped jobs today, top skills / companies / locations, aggregation run history.
- `POST /api/scrape/jobs`: admin-only public Remotive API aggregation; source URL and attribution, unique source keys, bounded imports, six-hour cooldown, added/duplicate/error counts.
- Imported jobs are publicly browsable and apply at their original Remotive URL. No sign-in gate is placed in front of imported listings.
- Nine illustrative seed listings are labeled "Sample listing"; they are not verified openings and do not accept real applications. Post a test employer job to exercise applications.
- Deterministic skill overlap endpoint supports matching experimentation. It is not represented as AI.

Three bonus features: OpenAPI documentation, unit tests, and durable database-backed rate limiting.

Not implemented: forgot-password email, file upload, Redis, email notifications, an LLM matching service, or a scheduled aggregation worker. Aggregation is manual with a six-hour cooldown. A resume URL is supported, rather than a resume upload.

## Local setup

Node.js 22.13+ is required. The starter supports pnpm; use the committed lockfile.

```sh
corepack enable
pnpm install --frozen-lockfile
```

1. Copy `config/env.example` to `.env.local`, set a strong admin password, and ensure the D1 `DB` binding is configured in `.openai/hosting.json`. Runtime secrets are never placed in the hosting manifest.
2. Start `pnpm dev`. In the managed preview environment, use `sites-preview start "$PWD"` instead.
3. Apply migrations to the local database using Wrangler and a local binding configuration (example in `config/wrangler.local.example.json`):

```sh
pnpm exec wrangler d1 execute DB --local --config config/wrangler.local.example.json --persist-to .wrangler/state --file drizzle/0000_volatile_lady_deathstrike.sql
```

4. Open the local server URL printed by the dev command. The first API request idempotently initializes roles, a JWT secret, and sample records. The admin account is synchronized from `ADMIN_EMAIL` and the secret `ADMIN_PASSWORD`. Increment `ADMIN_CREDENTIAL_REVISION` whenever changing these credentials; the next API request applies the update even to an already seeded database and expires existing sessions.
5. Register one employer (with a company name) and one candidate. Create a job as employer; apply/save as candidate; review as employer.

Production deployment applies Drizzle migrations before worker publication. To deploy outside Sites, configure the Worker build output's D1 binding and runtime secrets in Cloudflare; the `.openai` registration is specific to Sites.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm test:integration
```

`tests/domain.test.ts` verifies privilege-escalation rejection, job validation, pagination bounds, matching, HTML stripping, salted password verification, and tampered JWT rejection. `tests/worker-integration.mjs` exercises the compiled Worker against an isolated D1 database with a stubbed public feed, including aggregation deduplication, cooldown and server rendering. `tests/integration.mjs` exercises the end-to-end role and ownership boundary on a running local server. Run with `BASE_URL=http://localhost:<port> node tests/integration.mjs`.

## Architecture

- `components/portal.tsx`: reusable fields, job cards, company marks, guards, role-aware pages, and dashboards.
- `app/api/[...path]/route.ts`: REST transport, identity, role/ownership enforcement, request validation, and error translation.
- `lib/server/domain.ts`: input schemas, pagination, text normalization, skill matching.
- `lib/server/crypto.ts`: password hashing and JWT signing/verification.
- `lib/server/database.ts`: prepared D1 queries and safe public projections.
- `lib/server/aggregation.ts`: public feed adapter, deduplication, throttling and run recording.
- `lib/server/seed.ts`: idempotent initial sample data and account bootstrap.
- `db/schema.ts` and `drizzle/`: database schema and migrations.

The route handler is intentionally consolidated for this timed assessment. Domain, persistence, cryptography and source ingestion are kept separately for reuse and testing; a larger system should split resource controllers and repositories further.

## API reference

Base URL: `/api`. Bearer token returned by login/register, or secure login cookie. OpenAPI: `/docs/openapi.json`. Import `/docs/postman.json` into Postman. The API/resources UI is `/docs`.

| Method        | Route             | Access                                             |
| ------------- | ----------------- | -------------------------------------------------- |
| POST          | /auth/register    | Public candidate / employer                        |
| POST          | /auth/login       | Public                                             |
| GET           | /auth/me          | Current account or null                            |
| POST          | /auth/logout      | Clears cookie                                      |
| GET           | /jobs             | Public; q, location, mode, type, sort, page, limit |
| POST          | /jobs             | Employer                                           |
| GET           | /jobs/:id         | Public                                             |
| PUT / DELETE  | /jobs/:id         | Owning employer or admin                           |
| POST          | /jobs/:id/apply   | Candidate; employer-posted jobs only               |
| POST / DELETE | /jobs/:id/save    | Candidate                                          |
| GET           | /jobs/:id/match   | Candidate                                          |
| GET           | /applications     | Role-scoped and paginated                          |
| PUT           | /applications/:id | Owning employer or admin                           |
| GET           | /dashboard        | Role-scoped                                        |
| GET / PUT     | /profile          | Signed-in account                                  |
| POST          | /scrape/jobs      | Admin                                              |

Successful job lists return `{jobs, pagination: {page, limit, total, pages}}`. Scraping returns `{jobs_added, duplicates_skipped, errors}`. Errors return `{error}` or validation `{error, details}`. Statuses include 401, 403, 404, 409, 422, 429 and 503. Maximum page size is 50. Sort: `newest`, `oldest`, `title`. `owned=1` includes an employer's closed jobs; `saved=1` selects a candidate's saved jobs.

Login tokens expire after 24 hours. API requests using cookies reject cross-origin writes. Logout clears the browser cookie; externally copied bearer tokens remain valid until expiry (no token blacklist). Write-rate limits are per connecting IP per minute: 15 auth writes or 90 other writes. A proxy must correctly provide the trusted connecting-IP header.

## Database relationships

Roles → Users; Companies → Users and Jobs; Users (employer) → Jobs; Users (candidate) and Jobs → Applications; Users and Jobs → SavedJobs. Email, source key, candidate/job application pair, and user/job saved pair are unique. Jobs have indexes for status/mode/type, employer, company and posting date. Applications index candidate IDs. Foreign keys preserve ownership; deleting a job cascades its applications and saved records.

The SQL export is `/docs/schema.sql`. JSON skill arrays are validated in the application. Company names are not unique because unrelated employers can have the same company name. Aggregated records are deduplicated by source and external job ID.

## Aggregation source

Remotive public API: https://remotive.com/api/remote-jobs
Official terms and documentation: https://github.com/remotive-com/remote-jobs-api

The implementation attributes Remotive and links to the original listing, avoids registration gates for imported listings, and limits fetching to at most four times daily. Upstream availability is outside our control; errors are shown and recorded without inventing results. No private or restricted job site is scraped.

## Submission

Repository: https://github.com/punithrajkumar602-boop/PunithRaj-Job-Portal

The live app, database schema, OpenAPI specification, Postman collection and source ZIP are ready to review. The source ZIP is available at https://talentlane-jobs.punithrajkumar602.chatgpt.site/docs/Job-portal-File.zip. The assessment form still requires the applicant's resume and authenticated Google Forms submission.

Verified: seven unit tests, TypeScript checks and compiled-worker integration tests pass. The live admin login was verified. A production Remotive import added 17 jobs with zero duplicates and no errors.
