export const SYSTEM_PROMPT =
  'You are a senior SEO analyst. You produce honest, falsifiable, prioritised SEO audit reports for the exact submitted URL. Your output must be valid JSON only — no markdown, no preamble. If a data block is marked SIMULATED, do not describe it as the site owner\'s private Google Search Console, live PageSpeed, or live ranking-provider data. Every recommendation must include: finding, fix, estimated_impact (High/Medium/Low), effort (Hours/Days/Weeks), falsifiability_check (how we know if this worked).';

function compact(value, limit = 6000) {
  const json = JSON.stringify(value ?? null);
  if (json.length <= limit) return json;
  return `${json.slice(0, limit)}…`;
}

export function buildUserPrompt({
  url,
  businessType,
  city,
  state,
  onPage,
  technical,
  cwv,
  schema,
  gsc,
  rankings,
}) {
  const searchNote = gsc?.simulated
    ? 'SIMULATED SEARCH CONSOLE SAMPLE. These figures are not from the website\'s Google Search Console account. Real Search Console data requires the owner to authorize access. Do not describe them as measured private traffic.'
    : 'Provider data.';
  const labNote = cwv?.simulated
    ? 'SIMULATED PAGESPEED LAB DATA for the submitted URL. Not a live PageSpeed Insights response.'
    : 'Provider data.';
  const rankNote = rankings?.simulated
    ? 'SIMULATED RANKING SAMPLE for the submitted URL and keyword. Not a live DataForSEO response.'
    : 'Provider data.';
  return `Analyse the following SEO signals for this submitted URL: ${url}

Submitted URL: ${url}

Business type: ${businessType}

Business location: ${city}, ${state}

=== ON-PAGE DATA ===
${compact(onPage)}

=== TECHNICAL DATA ===
${compact(technical)}

=== CORE WEB VITALS ===
${labNote}
${compact(cwv)}

=== SCHEMA.ORG DATA ===
${compact(schema)}

=== GOOGLE SEARCH CONSOLE ===
${searchNote}
${compact(gsc)}

=== KEYWORD RANKINGS ===
${rankNote}
${compact(rankings)}

Respond ONLY with this JSON structure — no other text:

{
  "audit_version": "v1.0",
  "overall_score": <integer 0-100>,
  "score_breakdown": {
    "technical": <0-100>,
    "on_page": <0-100>,
    "content": <0-100>,
    "core_web_vitals": <0-100>,
    "schema": <0-100>
  },
  "critical_issues": [<max 5 items>],
  "important_issues": [<max 8 items>],
  "quick_wins": [<max 5 items — effort <= 2 hours>],
  "recommendations": [{
    "priority": "CRITICAL|HIGH|MEDIUM|LOW",
    "category": "Technical|OnPage|Content|Schema|CWV",
    "finding": "<what is wrong>",
    "fix": "<exact action to take>",
    "estimated_impact": "High|Medium|Low",
    "effort": "Hours|Days|Weeks",
    "falsifiability_check": "<how to verify this worked>"
  }],
  "executive_summary": "<3 sentences max, plain English>"
}`;
}
