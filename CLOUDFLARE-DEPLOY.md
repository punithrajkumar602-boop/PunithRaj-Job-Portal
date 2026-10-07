# Cloudflare Workers deployment

This project builds with Vinext and the Cloudflare Vite plugin. Do not use OpenNext auto-configuration.

1. In Cloudflare Storage & databases > D1, create `punithraj-job-portal-db`.
2. Copy its database ID into the Worker Build Variables as `D1_DATABASE_ID`. This ID is not a password.
3. In Workers & Pages > punithraj-job-portal > Settings > Build:
   - Build command: `pnpm run build && node scripts/prepare-cloudflare.mjs`
   - Deploy command: `pnpm exec wrangler d1 migrations apply DB --remote --config dist/server/wrangler.json && pnpm exec wrangler deploy --config dist/server/wrangler.json`
   - Root directory: `/`
   - Production branch: `main`
4. The build token needs access to this D1 database for migrations, in addition to Worker deployment permissions. Review the token permissions if migrations return an authorization error.
5. In Worker Settings > Variables and Secrets, add a runtime secret named `ADMIN_PASSWORD`. Enter the chosen password directly in Cloudflare, never in GitHub or build variables.
6. Set runtime `ADMIN_EMAIL` and `ADMIN_CREDENTIAL_REVISION` as needed. Increment the revision when changing admin credentials.
7. Redeploy after saving runtime secrets. Verify home, login, registration, role dashboards and aggregation on the workers.dev URL shown by Cloudflare.

The new database starts empty; the first API request seeds illustrative jobs and creates the configured admin. Existing Sites database records are not copied automatically. Run aggregation from the new admin dashboard to import real listings.

Do not use an unbuilt default `npx wrangler deploy`, which detects Next.js and runs an incompatible OpenNext migration.
