import { CLAUDE_MODEL, aiModeLabel, realClaudeEnabled } from './mode';

export { CLAUDE_MODEL, aiModeLabel, realClaudeEnabled };

export async function analyzeSeoData(input) {
  if (!realClaudeEnabled()) {
    console.log('[AI] Real Claude is not enabled. No result was generated.');
    const error = new Error('Real Claude analysis is not enabled. No audit result was generated.');
    error.status = 503;
    throw error;
  }

  console.log('[AI] Using real Claude API');
  const { analyzeWithRealClaude } = await import('./claude.real');
  return analyzeWithRealClaude(input);
}
