/** Model credentials live in localStorage — the key never touches the database. */
export interface AiConfig {
  api_key: string
  base_url: string
  model: string
}

export function getAiConfig(): AiConfig {
  return {
    api_key:  localStorage.getItem('study_ai_key')      ?? '',
    base_url: localStorage.getItem('study_ai_base_url') ?? 'https://openrouter.ai/api/v1',
    model:    localStorage.getItem('study_ai_model')    ?? 'anthropic/claude-opus-4-5',
  }
}
