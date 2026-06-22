import OpenAI from 'openai';
import { env } from '../../config/env';

// OpenAI-compatible LLM client. Can work with OpenAI, Gemini (via compat mode), OpenRouter, Groq, Ollama, etc.
export const llmClient = new OpenAI({
  apiKey: env.LLM_API_KEY || 'dummy-key-for-dev',
  baseURL: env.LLM_BASE_URL,
});
export const DEFAULT_MODEL = env.LLM_MODEL || 'gpt-4o-mini';
