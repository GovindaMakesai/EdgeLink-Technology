import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt';
import { buildFallbackAnalysis } from './fallback';
import { extractJson, validateAuditResult } from '../validations/ai-result';
import { mocksEnabled } from '../services/integrations';

function modelName() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
}

async function callClaude(input, previous) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const base = buildUserPrompt({
    url: input.url,
    businessType: input.businessType,
    city: input.city,
    state: input.state,
    onPage: input.onPage,
    technical: input.technical,
    cwv: input.pagespeed,
    schema: input.schema,
    gsc: input.gsc,
    rankings: input.rankings,
  });
  const content = previous
    ? `${base}\n\nThe previous response was invalid. Return only the JSON object, with integer scores, allowed enums, at most 5 critical issues, 8 important issues, 5 quick wins, and an executive summary of no more than 3 sentences.\n\nPrevious output:\n${String(previous).slice(0, 2000)}`
    : base;

  const response = await client.messages.create({
    model: modelName(),
    max_tokens: 4096,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function parseModel(text) {
  try {
    return validateAuditResult(extractJson(text));
  } catch (error) {
    return { ok: false, errors: [error.message], data: null };
  }
}

export async function analyzeSignals(input) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (mocksEnabled() || !key) {
    return {
      data: buildFallbackAnalysis(input),
      source: 'deterministic-fallback',
      reason: !key ? 'missing-api-key' : 'mock-mode',
      model: null,
    };
  }

  let lastErrors = [];
  let lastText = '';
  try {
    lastText = await callClaude(input);
    const first = parseModel(lastText);
    if (first.ok) {
      return { data: first.data, source: 'claude', reason: null, model: modelName() };
    }
    lastErrors = first.errors;
    lastText = await callClaude(input, lastText);
    const second = parseModel(lastText);
    if (second.ok) {
      return { data: second.data, source: 'claude', reason: 'retry', model: modelName() };
    }
    lastErrors = second.errors;
  } catch (error) {
    lastErrors = [error.message];
  }

  return {
    data: buildFallbackAnalysis(input),
    source: 'deterministic-fallback',
    reason: 'invalid-model-output',
    model: modelName(),
    errors: lastErrors,
  };
}
