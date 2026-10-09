# EdgeLink Technology

EdgeLink SEO Intelligence is a full-stack SEO automation dashboard for the EdgeLink technical assessment. An admin queues an audit for a real Indian city and state. A BullMQ worker crawls the public site, records deterministic on-page evidence, asks Claude to analyze that evidence, stores the result in PostgreSQL, and writes a PDF. PageSpeed, Search Console, rankings, and WhatsApp are included only when those providers are configured. Otherwise those fields stay not analyzed.

## Safe Testing / Claude API Usage

Claude runs only when `USE_REAL_CLAUDE=true` and `ANTHROPIC_API_KEY` is set. An empty key or a failed request does not produce a substitute score. Do not commit the key or prefix it with `NEXT_PUBLIC_`.

```env
USE_REAL_CLAUDE=true
ANTHROPIC_API_KEY=your_key
```

That path shows **AI Analysis: Claude API** and the worker log says `[AI] Using real Claude API`. City and state are checked against Indian locations before an audit is queued.

## Features

- Admin console and client portal
- Audit creation with live pipeline progress
- Fetch + Cheerio crawl, on-page, technical, schema, robots.txt, and sitemap checks
- PageSpeed, Google Search Console, and DataForSEO behind one mock switch
- Claude analysis with strict JSON validation and a development fallback
- Puppeteer PDF reports stored in Supabase Storage, with local disk only for development
- Mock Twilio WhatsApp plus a logged email handoff
- Cron endpoint for scheduled audits
- Demo client: Example Dental Clinic, Pune

## Architecture

Admin or cron calls `POST /api/audits` or `POST /api/cron/audits`. The API inserts an audit and enqueues `seo-audit-jobs`. A separate Node worker runs the pipeline and writes status back to PostgreSQL. The UI polls `GET /api/audits/[id]/status`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the flow and data model.

## Tech stack

Next.js 14 App Router, React, Tailwind CSS, shadcn-style Radix primitives, Node.js, BullMQ, Redis, PostgreSQL, Prisma, Cheerio, Puppeteer, Anthropic Claude, Zod, Vitest.

## Folder structure

```text
src/app            routes, admin, client portal, API
src/components     shell, visuals, forms
src/lib            prisma, auth, formatting
src/services       audit creation, analyzers, integrations, storage
src/crawlers       fetch + cheerio
src/queues         Redis connection and seo-audit-jobs
src/workers        BullMQ worker entry
src/ai             prompt, Claude, fallback
src/reports        HTML template and PDF
src/mocks          single USE_MOCKS switch and sample payloads
src/validations    URL, forms, AI schema
prisma             schema and demo seed
tests              unit and integration tests
```

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env`. If the database password contains `@`, encode it as `%40`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for Prisma |
| `AUTH_SECRET` | Yes | Signs the session cookie |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes | Admin password sign-in |
| `REDIS_URL` | Yes | Shared Upstash Redis for the API producer and the worker |
| `REDIS_TOKEN` | Only if the URL has no password | Optional Redis password |
| `USE_REAL_CLAUDE` | Yes for an AI result | `true` calls Claude. A missing or failed call does not invent a score |
| `ANTHROPIC_API_KEY` | Only for a real Claude test | Leave empty. Never commit a real key |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-sonnet-4-6` |
| `USE_MOCKS` | No | Ignored by the audit. Missing providers are reported as not analyzed |
| `CRON_SECRET` | For cron | Protects `POST /api/cron/audits` |
| `ALLOW_DEMO_LOGIN` | Public deploy | Set `false` outside a private demo |
| `SUPABASE_URL` | Production | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Server-only Storage access |
| `SUPABASE_STORAGE_BUCKET` | Production | Private bucket, default `audit-reports` |
| `NEXT_PUBLIC_APP_URL` | Production | Public origin, `https://edgelinktechnology.vercel.app` |

The API key stays on the server. An audit without `USE_REAL_CLAUDE=true` fails instead of inventing a score.

### Supabase

Put your own connection string in `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.iufnknnvtbtvakeiinmn.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.iufnknnvtbtvakeiinmn.supabase.co:5432/postgres?sslmode=require"
```

### Upstash

Use the Redis URL from the Upstash console. `rediss://` URLs already include the token. `REDIS_TOKEN` is only needed when the URL has no password.

### Anthropic

Leave `ANTHROPIC_API_KEY` empty and no Claude request is sent. The model is `claude-sonnet-4-6`. See [Safe Testing / Claude API Usage](#safe-testing--claude-api-usage).

## Evidence

The crawl, schema, on-page, robots, and sitemap steps read the submitted public URL. PageSpeed, Search Console, and rankings run only when their credentials are set. Sample files under `src/mocks` are for isolated tests and are not used by the audit.

## Local setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run db:seed
```

Start the app and the worker in two terminals:

```bash
npm run dev
npm run worker
```

Or both together:

```bash
npm run dev:all
```

Open http://localhost:3000 and choose **Continue as demo admin**.

## Database setup

```bash
npx prisma generate
npx prisma db push
```

`db push` updates the configured database to match `prisma/schema.prisma`. It does not drop data unless a field change requires it. Seed the demo clinic with `npm run db:seed`.

## Redis setup

Local Redis 5 or newer:

```env
REDIS_URL="redis://127.0.0.1:6379"
```

BullMQ rejects Redis 3.x. The older Windows Redis service on port 6379 is often 3.0.504, which is too old. Use Redis 5+, Memurai, Docker `redis:7`, or Upstash.

The worker logs `listening on seo-audit-jobs` when the connection is healthy.

## Running tests

```bash
npm test
```

## Building

```bash
npm run lint
npm run build
npm start
```

## End-to-end demo

With Postgres, Redis, `USE_REAL_CLAUDE=true`, and the worker running:

1. Sign in as demo admin.
2. Open **Start SEO audit**. The form is prefilled for Example Dental Clinic.
3. Submit. The audit becomes `QUEUED`.
4. The worker moves through crawl, PageSpeed, Search Console, schema, on-page, robots/sitemap, rankings, AI, save, PDF, and WhatsApp.
5. The progress screen polls real status.
6. Download the PDF and, if you want a second delivery, use **Send WhatsApp**.

`npm run e2e:audit` runs that path from the command line. Details are in [DEMO.md](DEMO.md).

## API

| Method | Path | Access |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Public |
| `POST` | `/api/auth/logout` | Session |
| `GET`, `POST` | `/api/clients` | Admin |
| `GET`, `POST` | `/api/audits` | Session / admin create |
| `GET` | `/api/audits/[id]` | Owner or admin |
| `GET` | `/api/audits/[id]/status` | Owner or admin |
| `GET` | `/api/audits/[id]/report` | Owner or admin |
| `POST` | `/api/audits/[id]/run` | Admin requeue |
| `POST` | `/api/audits/[id]/deliver` | Admin |
| `GET` | `/api/jobs/[id]` | Admin |
| `POST` | `/api/cron/audits` | `CRON_SECRET` |
| `GET` | `/api/health` | Public |

## Cron

Point cron-job.org at:

```text
POST https://YOUR_DOMAIN/api/cron/audits
Authorization: Bearer YOUR_CRON_SECRET
```

Schedule it monthly. The handler enqueues one audit per website that has a business type, city, state, and keyword. A missing or wrong secret returns 401. This does not use Vercel Cron.

## PDF reports

The worker renders the report with Puppeteer, then `src/services/storage.js` uploads `{auditId}.pdf` to a private Supabase Storage bucket. `GET /api/audits/[id]/report` reads that same object, so Vercel can download a file the worker created on another machine.

Local development uses the OS temp `reports` directory when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are unset. `NODE_ENV=production` refuses local disk and fails the audit with a stored error if Storage is not configured. `REPORTS_DIR` overrides the local directory only.

## WhatsApp

Without Twilio credentials the delivery log is `not_sent` and no message is sent. Email is not sent unless `SMTP_HOST` is configured, and even then this build does not open a mail transport.

## Production integrations

Set `USE_REAL_CLAUDE=true` and `ANTHROPIC_API_KEY` to call Claude. Add `PAGESPEED_API_KEY`, `GSC_ACCESS_TOKEN`, `GSC_SITE_URL`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, or Twilio credentials only for the provider you want collected. A missing provider is stored as not analyzed.

## Production deployment

Vercel serves the Next.js UI and API, including the BullMQ producer. It does not run the worker. A queued audit stays `QUEUED` until the worker process is running.

### Vercel

Set these environment variables on the Vercel project. `DATABASE_URL` and `DIRECT_URL` must exist at build time because `postinstall` runs `prisma generate`.

`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `REDIS_URL`, `USE_MOCKS`, `CRON_SECRET`, `ALLOW_DEMO_LOGIN=false`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`.

Use the Upstash `rediss://` URL. Do not use `redis://127.0.0.1:6379`.

`GET /api/health` reports `database`, `redis`, `storage`, and `worker` without returning secrets. `worker` is `listening` only after the separate process has written a heartbeat.

### Supabase PostgreSQL

Use the direct 5432 connection string for both `DATABASE_URL` and `DIRECT_URL`, with `sslmode=require`. Apply the schema without dropping data:

```bash
npx prisma generate
npx prisma db push
```

### Supabase Storage

In the Supabase dashboard, create a private bucket named `audit-reports` (or the name you set in `SUPABASE_STORAGE_BUCKET`). Copy the project URL and the service role key. Put the same three Storage variables on Vercel and on the worker. The worker creates the bucket if the service role is allowed to, but creating it in the dashboard is the reliable setup. Do not expose the service role key to the browser.

### Upstash Redis

Create a Redis database (Redis 5 or newer). Copy the TLS connection URL into `REDIS_URL` for both Vercel and the worker. BullMQ needs that TCP URL, not the Upstash REST URL. `REDIS_TOKEN` is only needed when the URL has no password.

### Render worker

Use a Render **Background Worker** with runtime **Docker** and Dockerfile path `Dockerfile.worker`. Do not use a Web Service. This process does not listen on a port, and Render will restart a Web Service that never opens one.

Do not use Render's native Node runtime. That image has no Chromium libraries, so PDF generation fails. The Dockerfile installs those libraries, downloads Puppeteer's Chrome, and starts `npm run worker` (`tsx src/workers/index.js`).

Leave Render's build command, start command, and Docker command empty. The image `CMD` is the start command.

Copy `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `USE_REAL_CLAUDE=true`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` from the Vercel project. Keep `ANTHROPIC_API_KEY` on the server only. The image does not contain secrets. A healthy log says `listening on seo-audit-jobs`, `storage supabase`, and `[AI] Using real Claude API` when the Claude flag is on. Render sends `SIGTERM` on shutdown, and the worker closes the BullMQ connection before it exits.

### cron-job.org

This project does not use Vercel Cron. Create a cron-job.org job:

- URL: `https://YOUR_DOMAIN/api/cron/audits`
- Method: `POST`
- Schedule: monthly
- Header: `Authorization: Bearer YOUR_CRON_SECRET`

A missing or wrong secret returns 401. The route enqueues one audit per website that has a business type, city, state, and keyword. The worker still has to be running to process those jobs.

## Troubleshooting

- **Redis connection**: BullMQ needs Redis 5 or newer. A Windows Redis 3.x service will be rejected. Confirm `REDIS_URL` and that the worker logs `listening on seo-audit-jobs`. The connection helper sets `maxRetriesPerRequest: null`.
- **Supabase connection**: encode reserved characters in the password and include `sslmode=require`. Use the direct 5432 URL for `DIRECT_URL`.
- **Prisma**: run `npx prisma generate` after install and `npx prisma db push` before the first audit.
- **Claude key**: leave it empty and the audit fails at the AI step. No substitute score is saved.
- **Puppeteer**: use `Dockerfile.worker` on the worker host. The first local install downloads Chrome.
- **Worker not running**: `/api/health` shows `worker: not_seen` and the audit stays `QUEUED`. Start `npm run worker`.
- **Queue stuck**: failed attempts retry up to three times. The audit page shows `FAILED` and the error after the last attempt.
- **PDF or Storage failure**: the audit is marked `FAILED` with the Storage or Puppeteer error. Confirm the bucket and the service role key on both hosts.

## Known limitations

- PageSpeed, Search Console, rankings, and WhatsApp stay not analyzed until their credentials are configured.
- Email is logged, not sent, unless you later attach a transport in `sendReportEmail`.
- The worker is a separate process from the Next.js server. Vercel cannot host it.
- Production PDFs live in Supabase Storage. Local disk is for development only.
- Demo login should be turned off with `ALLOW_DEMO_LOGIN=false` outside a private demo.
