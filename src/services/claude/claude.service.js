import { mockClaudeAnalysis } from './claude.mock';
import { CLAUDE_MODEL, aiModeLabel, realClaudeEnabled } from './mode';

export { CLAUDE_MODEL, aiModeLabel, realClaudeEnabled };

export async function analyzeSeoData(input) {
  if (!realClaudeEnabled()) {
    console.log('[AI] Using mock Claude implementation');
    return mockClaudeAnalysis(input);
  }

  console.log('[AI] Using real Claude API');
  const { analyzeWithRealClaude } = await import('./claude.real');
  return analyzeWithRealClaude(input);
}
