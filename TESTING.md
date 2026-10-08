# Testing

## Automated

```bash
npm test
```

Vitest covers:

- Mock switch and the exact PageSpeed, GSC, DataForSEO, and Twilio samples
- HTML extraction for title, meta description, headings, canonical, images, and alt text
- Malformed JSON-LD and schema types
- robots.txt sitemap discovery and sitemap URL counts
- Failed-crawl technical findings
- Audit form validation
- SSRF blocks for localhost, loopback, and private ranges
- AI JSON cleanup, enum checks, issue caps, quick-win effort, and summary length
- Deterministic fallback output
- Cron secret comparison
- BullMQ enqueue on `seo-audit-jobs` when Redis is up
- Puppeteer PDF bytes

`npm run lint` and `npm run build` are the production checks. `npx prisma generate` regenerates the client. `npx prisma db push` applies the schema when `DATABASE_URL` is set.

## End to end

Start Redis and Postgres, then:

```bash
npm run worker
npm run e2e:audit
```

`e2e:audit` starts its own worker if you run it alone. It creates the Example Dental Clinic audit, waits until `COMPLETED`, and checks that a score, PDF, and WhatsApp delivery exist.

Expected worker logs include stage names and:

```text
[MOCK WHATSAPP] → Client:
[MOCK WHATSAPP] → Score:
[MOCK WHATSAPP] → Report:
[MOCK EMAIL] → Recipient:
```

The UI path is the same job: admin form, status polling, score, recommendations, PDF download.

## Manual demo

See [DEMO.md](DEMO.md).

## Failure cases

- Bad URL or private host: API returns 400 and no job is created.
- Redis down: audit row is saved as `FAILED` and the API returns 503.
- Unreachable website: crawl error is stored, mocks still fill PageSpeed, GSC, and rankings, and the audit can complete.
- Invalid Claude JSON: one retry, then the deterministic fallback. The result source is `deterministic-fallback`.
- PDF crash: job retries, then `FAILED` with the error on the audit screen. Retry from that screen.
- Wrong cron secret: 401 and nothing is queued.
