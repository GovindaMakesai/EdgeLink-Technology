# EdgeLink Technology

EdgeLink SEO Intelligence is a full-stack SEO automation dashboard for the EdgeLink technical assessment. An admin queues an audit, a BullMQ worker crawls the site, collects mocked search and performance signals, asks Claude (or a deterministic fallback) for a structured brief, stores the result in PostgreSQL, writes a PDF, and records a mock WhatsApp delivery.

## Features

- Admin console and client portal
- Audit creation with live pipeline progress
- Fetch + Cheerio crawl, on-page, technical, schema, robots.txt, and sitemap checks
- PageSpeed, Google Search Console, and DataForSEO behind one mock switch
- Claude analysis with strict JSON validation and a development fallback
- Puppeteer PDF reports stored in the OS temp reports directory
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

Copy `.env.example` to `.env`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection |
| `DIRECT_URL` | Yes | Direct PostgreSQL URL for Prisma |
| `USE_MOCKS` | Yes | `true` uses the assessment mocks |
| `REDIS_URL` | Yes | Redis or Upstash connection |
| `REDIS_TOKEN` | Upstash if not in the URL | Optional password |
| `ANTHROPIC_API_KEY` | No | Empty uses the deterministic fallback |
| `CRON_SECRET` | For cron | Protects `POST /api/cron/audits` |
| `AUTH_SECRET` | Yes | Signs the session cookie |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Yes | Admin sign-in |
| `ALLOW_DEMO_LOGIN` | Local demo | `true` shows one-click demo entry |
| `NEXT_PUBLIC_APP_URL` | Yes | Public origin |

Never commit `.env`. If the database password contains `@`, encode it as `%40`.

### Supabase

Put your own connection string in `.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.iufnknnvtbtvakeiinmn.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.iufnknnvtbtvakeiinmn.supabase.co:5432/postgres?sslmode=require"
```

### Upstash

Use the Redis URL from the Upstash console. `rediss://` URLs already include the token. `REDIS_TOKEN` is only needed when the URL has no password.

### Anthropic

Set `ANTHROPIC_API_KEY` to call Claude. The model is `claude-sonnet-4-6` unless `ANTHROPIC_MODEL` overrides it. With no key, or with `USE_MOCKS=true`, the worker still returns a valid audit from the deterministic fallback and the UI labels it as a development fallback.

## Mock mode

```env
USE_MOCKS=true
```

`src/mocks/index.js` is the only switch. PageSpeed, Search Console, DataForSEO, and Twilio read it. The crawl, schema, on-page, robots, and sitemap steps still run.

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

With Postgres, Redis, `USE_MOCKS=true`, and the worker running:

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

Puppeteer writes `{auditId}.pdf` under the OS temp `reports` directory (`/tmp/reports` on Unix). Set `REPORTS_DIR` to override. Downloads go through the report API, which only serves files inside that directory. `src/services/storage.js` is the place to swap in Cloudflare R2 later.

## WhatsApp mock

With `USE_MOCKS=true`, delivery calls `src/mocks/twilio.mock.js`, which logs:

```text
[MOCK WHATSAPP] → Client:
[MOCK WHATSAPP] → Score:
[MOCK WHATSAPP] → Report:
```

The mock SID is stored on `DeliveryLog`. Email is logged the same way and is not treated as delivered.

## Production integrations

Set `USE_MOCKS=false` and provide `PAGESPEED_API_KEY`, `GSC_ACCESS_TOKEN`, `GSC_SITE_URL`, `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`, and Twilio credentials. Each service returns the same shape the pipeline already stores. Claude is used when `ANTHROPIC_API_KEY` is set and mocks are off.

## Deployment

- Next.js app: Vercel, with the env vars above.
- Database: Supabase or Neon PostgreSQL.
- Queue: Upstash Redis (`rediss://` URL).
- Cron: cron-job.org hitting the protected endpoint.
- Worker: a long-running Node process (`npm run worker`) on Railway, Fly, Render, or a VM.

Vercel serverless cannot hold a persistent BullMQ worker. Do not expect queued audits to finish unless the worker process is running somewhere that can see the same Redis and Postgres.

## Troubleshooting

- **Redis connection**: BullMQ needs Redis 5 or newer. A Windows Redis 3.x service will be rejected. Confirm `REDIS_URL` and that the worker logs `listening on seo-audit-jobs`. The connection helper sets `maxRetriesPerRequest: null`.
- **Supabase connection**: encode reserved characters in the password and include `sslmode=require`. Use the direct 5432 URL for `DIRECT_URL`.
- **Prisma**: run `npx prisma generate` after install and `npx prisma db push` before the first audit.
- **Claude key**: leave it empty for the fallback. A key with `USE_MOCKS=true` still uses the fallback.
- **Puppeteer**: the first install downloads Chrome. On a server, the worker image needs the Puppeteer system libraries.
- **Worker not running**: the audit stays `QUEUED`. Start `npm run worker`.
- **Queue stuck**: failed attempts retry up to three times. The audit page shows `FAILED` and the error after the last attempt.
- **PDF failure**: the audit is marked failed and can be retried. Check that the temp directory is writable.

## Known limitations

- External SEO providers and WhatsApp are mocks when `USE_MOCKS=true`.
- Email is logged, not sent, unless you later attach a transport in `sendReportEmail`.
- The worker is a separate process from the Next.js server.
- Report files live on local disk, so a serverless download only works on the machine that generated the PDF.
- Demo login should be turned off with `ALLOW_DEMO_LOGIN=false` outside a private demo.
