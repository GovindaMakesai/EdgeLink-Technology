import { describe, expect, it } from 'vitest';
import { getPageSpeed, getRankings, getSearchConsole, sendWhatsApp } from '../src/services/integrations';

describe('provider results are not fabricated when credentials are missing', () => {
  it('returns not analyzed for PageSpeed, Search Console, rankings, and WhatsApp', async () => {
    delete process.env.PAGESPEED_API_KEY;
    delete process.env.GSC_ACCESS_TOKEN;
    delete process.env.GSC_SITE_URL;
    delete process.env.DATAFORSEO_LOGIN;
    delete process.env.DATAFORSEO_PASSWORD;
    delete process.env.TWILIO_ACCOUNT_SID;
    process.env.USE_MOCKS = 'true';

    const pagespeed = await getPageSpeed('https://www.edgelinktechnology.com/');
    const gsc = await getSearchConsole({ siteUrl: 'https://www.edgelinktechnology.com/', keyword: 'seo' });
    const rankings = await getRankings({ keyword: 'seo', url: 'https://www.edgelinktechnology.com/' });
    const whatsapp = await sendWhatsApp({ score: 50, to: '+910000000000' });

    expect(pagespeed.status).toBe('NOT_ANALYZABLE');
    expect(pagespeed.analyzed).toBe(false);
    expect(pagespeed.categories).toBeUndefined();
    expect(gsc.status).toBe('NOT_ANALYZABLE');
    expect(gsc.rows).toBeUndefined();
    expect(rankings.status).toBe('NOT_ANALYZABLE');
    expect(rankings.client_rank_position).toBeUndefined();
    expect(whatsapp.status).toBe('not_sent');
    expect(whatsapp.sid).toBeNull();
  });
});
