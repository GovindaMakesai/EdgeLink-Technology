import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, buildUserPrompt } from '../../ai/prompt';
import { extractJson, validateAuditResult } from '../../validations/ai-result';
import { CLAUDE_MODEL } from './mode';

function modelName() {
  return process.env.ANTHROPIC_MODEL || CLAUDE_MODEL;
}

function safeStatus(error) {
  return error?.status || error?.statusCode || 'unknown';
}

async function requestClaude(input, previous) {
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
    max_tokens: 8192,
    temperature: 0,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
  return { text, stopReason: response.stop_reason || 'unknown' };
}

function parseModel(text) {
  try {
    return validateAuditResult(extractJson(text));
  } catch {
    return { ok: false, errors: ['Model output was not valid JSON'], data: null };
  }
}

export async function analyzeWithRealClaude(input) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('[AI] Real Claude is enabled but ANTHROPIC_API_KEY is not set. No request was sent.');
    throw new Error('ANTHROPIC_API_KEY is required when real Claude is enabled');
  }

  let lastText = '';
  try {
    const firstResponse = await requestClaude(input);
    lastText = firstResponse.text;
    const first = parseModel(lastText);
    if (first.ok) {
      console.log(`[AI] Real Claude analysis accepted with ${modelName()}`);
      return { data: first.data, source: 'claude', reason: null, model: modelName() };
    }
    console.log(`[AI] Real Claude returned invalid JSON. stop=${firstResponse.stopReason} chars=${lastText.length} errors=${first.errors.slice(0, 4).join('; ')}. Retrying once. Mock analysis was not used.`);
    const secondResponse = await requestClaude(input, lastText);
    lastText = secondResponse.text;
    const second = parseModel(lastText);
    if (second.ok) {
      console.log(`[AI] Real Claude analysis accepted after retry with ${modelName()}`);
      return { data: second.data, source: 'claude', reason: 'retry', model: modelName() };
    }
    console.log(`[AI] Real Claude returned invalid JSON after retry. stop=${secondResponse.stopReason} chars=${lastText.length} errors=${second.errors.slice(0, 4).join('; ')}. Mock analysis was not used.`);
    throw new Error('Claude returned invalid JSON');
  } catch (error) {
    if (error?.message === 'Claude returned invalid JSON' || error?.message === 'ANTHROPIC_API_KEY is required when real Claude is enabled') {
      throw error;
    }
    console.log(`[AI] Real Claude request failed with status ${safeStatus(error)}. Mock analysis was not used.`);
    throw new Error('Claude request failed');
  }
}
