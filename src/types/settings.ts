export type LLMProvider = 'ollama' | 'openai' | 'anthropic' | 'google' | 'groq' | 'xai';

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

export interface AppSettings {
  deepgramApiKey: string;
  provider: LLMProvider;
  ollama: ProviderConfig;
  openai: ProviderConfig;
  anthropic: ProviderConfig;
  google: ProviderConfig;
  groq: ProviderConfig;
  xai: ProviderConfig;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  deepgramApiKey: '',
  provider: 'ollama',
  ollama: { apiKey: '', model: 'llama3.2', baseUrl: 'http://127.0.0.1:11434' },
  openai: { apiKey: '', model: 'gpt-4o', baseUrl: '' },
  anthropic: { apiKey: '', model: 'claude-sonnet-4-20250514', baseUrl: '' },
  google: { apiKey: '', model: 'gemini-2.5-flash', baseUrl: '' },
  groq: { apiKey: '', model: 'llama-3.3-70b-versatile', baseUrl: '' },
  xai: { apiKey: '', model: 'grok-2-latest', baseUrl: '' },
  temperature: 0.7,
  maxTokens: 2048,
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  ollama: 'Ollama (Local)',
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
  google: 'Google (Gemini)',
  groq: 'Groq',
  xai: 'xAI (Grok)',
};
