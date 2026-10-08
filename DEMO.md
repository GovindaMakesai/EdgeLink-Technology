# Demo

The new-audit form prefills `DEMO_TARGET_URL` from the environment. The default is `https://www.edgelinktechnology.com/`. Replace that URL with any other public website before starting an audit.

- URL: `https://www.edgelinktechnology.com/`
- Business type: Software company
- City: leave blank and type the real city
- State: leave blank and type the real state
- Keyword: `edgelink technology`

PageSpeed, Search Console, and ranking rows in mock mode are simulated samples tied to the submitted URL. They are not the site owner's private Search Console property. Claude runs when `USE_REAL_CLAUDE=true`, including while `USE_MOCKS=true`.

## Prepare

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
npm run worker
```

`.env` needs `USE_MOCKS=true`, `USE_REAL_CLAUDE=true`, `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `AUTH_SECRET`, and `CRON_SECRET`. `ANTHROPIC_API_KEY` stays on the server. PageSpeed, Search Console, and rankings stay mocked. Claude runs when the flag is true.

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
- The audit shows **AI Analysis: Claude API** and stores source `claude` when `USE_REAL_CLAUDE=true`. With the flag off, it shows **AI Analysis: Mock Mode** and stores source `mock`.
- The worker terminal prints the three `[MOCK WHATSAPP]` lines.
