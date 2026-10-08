export const CLAUDE_MODEL = 'claude-sonnet-4-6';

export function realClaudeEnabled(env = process.env) {
  return env.USE_REAL_CLAUDE === 'true';
}

export function aiModeLabel(source) {
  return source === 'claude' ? 'Claude API' : 'Mock Mode';
}
