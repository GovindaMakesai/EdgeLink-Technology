import { describe, expect, it } from 'vitest';
import { breakdownRows, scoreFromBreakdown } from '../src/lib/score';

describe('score consistency', () => {
  const breakdown = { technical: 62, on_page: 58, content: 65, core_web_vitals: 50, schema: 30 };

  it('excludes unmeasured vitals from the overall score', () => {
    const scored = scoreFromBreakdown(breakdown, { analyzed: false, status: 'NOT_ANALYZABLE' });
    expect(scored.overall).toBe(54);
    expect(scored.breakdown.core_web_vitals_status).toBe('NOT_ANALYZABLE');
    expect(scored.included).not.toContain('core_web_vitals');
  });

  it('includes vitals only when PageSpeed was actually analyzed', () => {
    const scored = scoreFromBreakdown(breakdown, { analyzed: true });
    expect(scored.overall).toBe(53);
    expect(scored.included).toContain('core_web_vitals');
  });

  it('labels unmeasured vitals as not analyzed instead of the unused number', () => {
    const rows = breakdownRows({ ...breakdown, core_web_vitals_status: 'NOT_ANALYZABLE' });
    expect(rows.find((row) => row.label === 'Vitals').note).toBe('Not analyzed');
    expect(rows.find((row) => row.label === 'Vitals').value).toBeNull();
    expect(rows.find((row) => row.label === 'Technical').value).toBe(62);
  });
});
