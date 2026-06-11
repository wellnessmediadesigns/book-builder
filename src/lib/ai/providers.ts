import type { AiConfig, AiMessage } from "./types";
import { PROVIDER_PRESETS } from "./types";

export class AiError extends Error {
  code: string;
  constructor(message: string, code = "ai_error") {
    super(message);
    this.code = code;
  }
}

function resolveBaseUrl(config: AiConfig): string {
  return (config.baseUrl || PROVIDER_PRESETS[config.provider].baseUrl).replace(/\/$/, "");
}

export function configIsReady(config: AiConfig): boolean {
  if (PROVIDER_PRESETS[config.provider].needsKey && !config.apiKey) return false;
  return Boolean(config.model);
}

/**
 * All three providers speak the OpenAI-compatible /chat/completions shape,
 * which keeps the layer modular and trivial to extend with future providers.
 */
function buildRequest(config: AiConfig, messages: AiMessage[], stream: boolean) {
  const url = `${resolveBaseUrl(config)}/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) headers["Authorization"] = `Bearer ${config.apiKey}`;
  if (config.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://quire.studio";
    headers["X-Title"] = "Quire";
  }
  const body = JSON.stringify({
    model: config.model,
    messages,
    temperature: config.temperature,
    stream,
  });
  return { url, headers, body };
}

export async function complete(config: AiConfig, messages: AiMessage[]): Promise<string> {
  const { url, headers, body } = buildRequest(config, messages, false);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body });
  } catch {
    throw new AiError(
      `Could not reach ${config.provider}. Check the provider URL and your network.`,
      "network",
    );
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AiError(humanizeError(res.status, detail), `http_${res.status}`);
  }
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string") throw new AiError("The model returned no text.", "empty");
  return text.trim();
}

/** Streams text deltas as they arrive (SSE). */
export async function* stream(
  config: AiConfig,
  messages: AiMessage[],
): AsyncGenerator<string> {
  const { url, headers, body } = buildRequest(config, messages, true);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body });
  } catch {
    throw new AiError(
      `Could not reach ${config.provider}. Check the provider URL and your network.`,
      "network",
    );
  }
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new AiError(humanizeError(res.status, detail), `http_${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }
}

function humanizeError(status: number, detail: string): string {
  if (status === 401) return "That API key was rejected. Re-check it in Settings.";
  if (status === 403) return "Access denied for this model. Try a different model or key.";
  if (status === 404) return "Model or endpoint not found. Check the model name and provider URL.";
  if (status === 429) return "Rate limited by the provider. Wait a moment and try again.";
  if (status >= 500) return "The provider is having trouble right now. Try again shortly.";
  const snippet = detail.slice(0, 180);
  return `Request failed (${status})${snippet ? `: ${snippet}` : "."}`;
}
