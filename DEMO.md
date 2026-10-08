# Demo

Example Dental Clinic is fixture data for this assessment, not a customer.

- URL: `https://example-dental-clinic.com`
- Business type: Dental Clinic
- City: Pune
- State: Maharashtra
- Keyword: `dental clinic pune`

## Prepare

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
npm run worker
```

`.env` needs `USE_MOCKS=true`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `AUTH_SECRET`, and `CRON_SECRET`. Claude can be empty.

## Click path

1. Open http://localhost:3000.
2. Choose **Continue as demo admin**.
3. Choose **Start SEO audit**.
4. Leave the prefilled clinic fields and press **Start SEO audit**.
5. The detail screen shows `QUEUED`, then the worker stages, then a score.
6. Read critical issues, quick wins, and recommendations.
7. Download the PDF.
8. Press **Send WhatsApp** to record another mock delivery.
9. Sign out and choose **View demo client portal** to see the same audit without admin actions.

The command-line equivalent is `npm run e2e:audit`.

## What you should see

- Status ends at `COMPLETED`.
- Score breakdown has technical, on-page, content, Core Web Vitals, and schema.
- PageSpeed values include LCP `4.2 s`, CLS `0.08`, and INP `280 ms` while mocks are on.
- Search Console totals are 167 clicks and 4560 impressions.
- Ranking position is 4 for the dental keyword sample.
- If Claude is not configured, a **Development fallback** badge is shown. The recommendations are still a real structured result, not an error message.
- The worker terminal prints the three `[MOCK WHATSAPP]` lines.
