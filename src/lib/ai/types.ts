export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiConfig = {
  provider: "openai" | "openrouter" | "ollama";
  model: string;
  apiKey: string;
  baseUrl: string;
  temperature: number;
  maxContext: number;
};

export type AiResult = {
  text: string;
  model: string;
  provider: string;
};

export const PROVIDER_PRESETS: Record<
  AiConfig["provider"],
  { label: string; baseUrl: string; needsKey: boolean; models: string[]; help: string }
> = {
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    help: "Use an OpenAI API key (platform.openai.com).",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o-mini",
      "google/gemini-flash-1.5",
      "meta-llama/llama-3.1-70b-instruct",
    ],
    help: "One key, many models (openrouter.ai).",
  },
  ollama: {
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    models: ["llama3.1", "mistral", "qwen2.5", "phi3"],
    help: "Local models, no key (ollama.com). Deployed on Cloudflare? Point the URL at a tunnel to your machine.",
  },
};
