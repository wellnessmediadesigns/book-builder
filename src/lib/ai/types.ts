export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AiConfig = {
  provider: "workersai" | "cerebras" | "groq" | "google" | "openai" | "openrouter" | "ollama";
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

/** Providers whose generation runs through a Cloudflare binding rather than HTTP. */
export const BINDING_PROVIDERS = new Set(["workersai"]);

export const PROVIDER_PRESETS: Record<
  AiConfig["provider"],
  { label: string; baseUrl: string; needsKey: boolean; models: string[]; help: string }
> = {
  workersai: {
    label: "Cloudflare AI",
    baseUrl: "",
    needsKey: false,
    models: [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistralai/mistral-small-3.1-24b-instruct",
      "@cf/qwen/qwen2.5-coder-32b-instruct",
    ],
    help: "Free on your Cloudflare account — 10,000 requests/day, no API key. Runs on the same platform you deploy to.",
  },
  cerebras: {
    label: "Cerebras (free · fast)",
    baseUrl: "https://api.cerebras.ai/v1",
    needsKey: true,
    models: ["gpt-oss-120b", "llama-3.3-70b", "llama3.1-8b", "qwen-3-32b"],
    help: "Free, extremely fast, 1M tokens/day, no card. Get a key at cloud.cerebras.ai. gpt-oss-120b is the most capable.",
  },
  google: {
    label: "Google Gemini (free)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    needsKey: true,
    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"],
    help: "Most generous free tier. Get a key at aistudio.google.com (free, no card).",
  },
  groq: {
    label: "Groq (free · fast)",
    baseUrl: "https://api.groq.com/openai/v1",
    needsKey: true,
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
    ],
    help: "Free and fast. Get a key at console.groq.com (use a current model id if one errors).",
  },
  openai: {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    needsKey: true,
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1", "o4-mini"],
    help: "Best prose quality. Cheap with gpt-4o-mini. Key at platform.openai.com.",
  },
  openrouter: {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    needsKey: true,
    models: [
      "meta-llama/llama-3.3-70b-instruct:free",
      "deepseek/deepseek-chat-v3.1:free",
      "google/gemma-3-12b-it:free",
      "nvidia/llama-3.1-nemotron-nano-8b-v1:free",
      "mistralai/mistral-7b-instruct:free",
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o-mini",
    ],
    help: "One key, many models. The ':free' ones cost nothing. Must be a chat/instruct model — rerank, embedding, and content-safety models can't write.",
  },
  ollama: {
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    needsKey: false,
    models: ["llama3.1", "mistral", "qwen2.5", "phi3"],
    help: "Local models, no key (ollama.com). Deployed on Cloudflare? Point the URL at a tunnel to your machine.",
  },
};
