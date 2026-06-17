import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { LLMProvider, AppSettings } from '../types/settings';

function buildSystemPrompt(context?: string): string {
  const base = 'You are a helpful AI assistant for a 3D model viewer application. '
    + 'Answer questions concisely and accurately. '
    + 'When describing 3D objects, focus on their visual appearance, structure, and notable features.';
  if (context) {
    return `${base}\n\nCurrent 3D scene context:\n${context}`;
  }
  return base;
}

export async function generateAIResponse(
  settings: AppSettings,
  prompt: string,
  context?: string,
  chatHistory?: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const { provider, temperature, maxTokens } = settings;
  const providerCfg = settings[provider];
  const model = providerCfg.model || getDefaultModel(provider);

  let apiKey = providerCfg.apiKey;
  if (!apiKey && provider === 'ollama') apiKey = 'ollama';

  const systemPrompt = buildSystemPrompt(context);

  let messages: { role: 'user' | 'assistant'; content: string }[] = [];
  if (chatHistory && chatHistory.length > 0) {
    messages = [...chatHistory, { role: 'user', content: prompt }];
  } else {
    messages = [{ role: 'user', content: prompt }];
  }

  try {
    const result = await routeToProvider(provider, model, apiKey, providerCfg.baseUrl, systemPrompt, messages, temperature, maxTokens);
    return result;
  } catch (err) {
    throw new Error(`${PROVIDER_LABELS[provider]} error: ${(err as Error).message}`);
  }
}

function getDefaultModel(provider: LLMProvider): string {
  const models: Record<LLMProvider, string> = {
    ollama: 'llama3.2',
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-20250514',
    google: 'gemini-2.5-flash',
    groq: 'llama-3.3-70b-versatile',
    xai: 'grok-2-latest',
  };
  return models[provider];
}

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  ollama: 'Ollama',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
};

async function routeToProvider(
  provider: LLMProvider,
  model: string,
  apiKey: string,
  baseUrl: string,
  systemPrompt: string,
  messages: { role: 'user' | 'assistant'; content: string }[],
  temperature: number,
  maxTokens: number,
): Promise<string> {
  switch (provider) {
    case 'ollama': {
      const client = createOpenAI({
        baseURL: baseUrl ? `${baseUrl}/v1` : 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama',
      });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    case 'openai': {
      const client = createOpenAI({ apiKey });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    case 'anthropic': {
      const client = createAnthropic({ apiKey });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    case 'google': {
      const client = createGoogleGenerativeAI({ apiKey });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    case 'groq': {
      const client = createGroq({ apiKey });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    case 'xai': {
      const client = createOpenAI({
        baseURL: 'https://api.x.ai/v1',
        apiKey,
      });
      const { text } = await generateText({
        model: client(model),
        system: systemPrompt,
        messages,
        temperature,
        maxOutputTokens: maxTokens,
      });
      return text;
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
