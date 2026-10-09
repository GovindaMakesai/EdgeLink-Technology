export function breakdownRows(breakdown) {
  const vitalsUnavailable = breakdown?.core_web_vitals_status && breakdown.core_web_vitals_status !== 'COMPLETED';
  return [
    { label: 'Technical', value: breakdown?.technical, note: null },
    { label: 'On-page', value: breakdown?.on_page, note: null },
    { label: 'Content', value: breakdown?.content, note: null },
    { label: 'Vitals', value: vitalsUnavailable ? null : breakdown?.core_web_vitals, note: vitalsUnavailable ? 'Not analyzed' : null },
    { label: 'Schema', value: breakdown?.schema, note: null },
  ];
}

export function scoreFromBreakdown(scoreBreakdown, pagespeed) {
  const breakdown = { ...(scoreBreakdown || {}) };
  const measured = pagespeed?.analyzed === true && !pagespeed?.failed;
  const included = ['technical', 'on_page', 'content', 'schema'];
  if (measured) included.push('core_web_vitals');
  breakdown.core_web_vitals_status = measured ? 'COMPLETED' : (pagespeed?.failed ? 'FAILED' : 'NOT_ANALYZABLE');
  const numbers = included
    .map((key) => Number(breakdown[key]))
    .filter((value) => Number.isFinite(value));
  const overall = numbers.length ? Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length) : null;
  return { overall, breakdown, included };
}
