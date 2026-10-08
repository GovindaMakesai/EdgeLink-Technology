import { z } from 'zod';

const recommendationSchema = z.object({
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  category: z.enum(['Technical', 'OnPage', 'Content', 'Schema', 'CWV']),
  finding: z.string().trim().min(3).max(500),
  fix: z.string().trim().min(3).max(800),
  estimated_impact: z.enum(['High', 'Medium', 'Low']),
  effort: z.enum(['Hours', 'Days', 'Weeks']),
  falsifiability_check: z.string().trim().min(3).max(400),
});

const quickWinSchema = z.object({
  finding: z.string().trim().min(3).max(400),
  fix: z.string().trim().min(3).max(400),
  effort: z.literal('Hours'),
  estimated_hours: z.number().min(0.25).max(2),
  estimated_impact: z.enum(['High', 'Medium', 'Low']),
});

export const auditResultSchema = z.object({
  audit_version: z.literal('v1.0'),
  overall_score: z.number().int().min(0).max(100),
  score_breakdown: z.object({
    technical: z.number().int().min(0).max(100),
    on_page: z.number().int().min(0).max(100),
    content: z.number().int().min(0).max(100),
    core_web_vitals: z.number().int().min(0).max(100),
    schema: z.number().int().min(0).max(100),
  }),
  critical_issues: z.array(z.string().trim().min(3).max(400)).max(5),
  important_issues: z.array(z.string().trim().min(3).max(400)).max(8),
  quick_wins: z.array(quickWinSchema).max(5),
  recommendations: z.array(recommendationSchema).min(1).max(20),
  executive_summary: z.string().trim().min(20).max(900),
});

function limitSentences(text, max = 3) {
  let result = String(text || '').trim();
  while (sentenceCount(result) > max) {
    const shorter = result.replace(/[.!?][^.!?]*$/, '').trim();
    if (!shorter || shorter === result) break;
    result = shorter;
  }
  return result;
}

function sentenceCount(text) {
  const cleaned = String(text)
    .replace(/\b\d+\.\d+\b/g, (match) => match.replace('.', ''))
    .replace(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi, (match) => match.replaceAll('.', ''));
  return cleaned
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function asString(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return String(value.finding || value.fix || value.action || value.text || '').trim();
  }
  return '';
}

function clip(value, max) {
  const text = asString(value);
  return text.length > max ? text.slice(0, max).trim() : text;
}

function categoryOf(value) {
  const key = String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
  const map = {
    technical: 'Technical',
    onpage: 'OnPage',
    content: 'Content',
    schema: 'Schema',
    cwv: 'CWV',
    corewebvitals: 'CWV',
  };
  return map[key] || value;
}

function priorityOf(value) {
  const key = String(value || '').toUpperCase();
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(key) ? key : value;
}

function roundScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  return Math.round(number);
}

export function extractJson(text) {
  const trimmed = String(text || '').trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('Model output did not contain a JSON object');
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export function normalizeAiPayload(input) {
  const source = input && typeof input === 'object' ? input : {};
  const breakdown = source.score_breakdown || {};
  const recommendations = Array.isArray(source.recommendations) ? source.recommendations : [];
  const quickWins = Array.isArray(source.quick_wins) ? source.quick_wins : [];

  return {
    audit_version: 'v1.0',
    overall_score: roundScore(source.overall_score),
    score_breakdown: {
      technical: roundScore(breakdown.technical),
      on_page: roundScore(breakdown.on_page),
      content: roundScore(breakdown.content),
      core_web_vitals: roundScore(breakdown.core_web_vitals),
      schema: roundScore(breakdown.schema),
    },
    critical_issues: (Array.isArray(source.critical_issues) ? source.critical_issues : [])
      .map((item) => clip(item, 400))
      .filter(Boolean)
      .slice(0, 5),
    important_issues: (Array.isArray(source.important_issues) ? source.important_issues : [])
      .map((item) => clip(item, 400))
      .filter(Boolean)
      .slice(0, 8),
    quick_wins: quickWins.slice(0, 5).map((item) => {
      if (typeof item === 'string') {
        return {
          finding: item.trim(),
          fix: item.trim(),
          effort: 'Hours',
          estimated_hours: 1,
          estimated_impact: 'Medium',
        };
      }
      const hours = Number(item?.estimated_hours ?? 1);
      return {
        finding: clip(item?.finding || item, 400),
        fix: clip(item?.fix || item?.finding || item, 400),
        effort: 'Hours',
        estimated_hours: Number.isFinite(hours) ? Math.min(2, Math.max(0.25, hours)) : 1,
        estimated_impact: ['High', 'Medium', 'Low'].includes(item?.estimated_impact)
          ? item.estimated_impact
          : 'Medium',
      };
    }),
    recommendations: recommendations.slice(0, 20).map((item) => ({
      priority: priorityOf(item?.priority),
      category: categoryOf(item?.category),
      finding: clip(item?.finding, 500),
      fix: clip(item?.fix, 800),
      estimated_impact: ['High', 'Medium', 'Low'].includes(item?.estimated_impact) ? item.estimated_impact : 'Medium',
      effort: ['Hours', 'Days', 'Weeks'].includes(item?.effort) ? item.effort : 'Days',
      falsifiability_check: clip(item?.falsifiability_check, 400),
    })),
    executive_summary: clip(limitSentences(source.executive_summary, 3), 900),
  };
}

export function validateAuditResult(input) {
  const normalized = normalizeAiPayload(input);
  const parsed = auditResultSchema.safeParse(normalized);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.issues.map((issue) => issue.message), data: null };
  }
  if (sentenceCount(parsed.data.executive_summary) > 3) {
    return { ok: false, errors: ['executive_summary exceeds 3 sentences'], data: null };
  }
  if (parsed.data.quick_wins.some((item) => item.estimated_hours > 2 || item.effort !== 'Hours')) {
    return { ok: false, errors: ['quick wins must be completable within 2 hours'], data: null };
  }
  return { ok: true, errors: [], data: parsed.data };
}
