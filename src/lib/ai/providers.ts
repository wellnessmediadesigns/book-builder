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

/** Lazy import keeps the Cloudflare-only binding code out of non-CF code paths. */
async function workersai() {
  return import("./workersai");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POSTs with automatic retry on rate limits (429) and transient server errors
 * (502/503/529) — smooths over flaky free tiers. Honors Retry-After when sent.
 */
async function postWithRetry(
  url: string,
  init: RequestInit,
  provider: string,
  attempts = 3,
): Promise<Response> {
  const backoff = [800, 2200, 4500];
  let lastDetail = "";
  for (let i = 0; i < attempts; i++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      if (i === attempts - 1)
        throw new AiError(
          `Could not reach ${provider}. Check the provider URL and your network.`,
          "network",
        );
      await sleep(backoff[i]);
      continue;
    }
    if (res.status === 429 || res.status === 502 || res.status === 503 || res.status === 529) {
      if (i === attempts - 1) return res;
      const retryAfter = Number(res.headers.get("retry-after"));
      const wait = retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : backoff[i];
      lastDetail = await res.text().catch(() => "");
      await sleep(wait);
      continue;
    }
    return res;
  }
  // Should be unreachable, but satisfy the type checker.
  throw new AiError(humanizeError(429, lastDetail), "http_429");
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
  if (config.provider === "workersai") {
    const { workersComplete } = await workersai();
    return workersComplete(config.model, messages, config.temperature);
  }
  const { url, headers, body } = buildRequest(config, messages, false);
  const res = await postWithRetry(url, { method: "POST", headers, body }, config.provider);
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
  if (config.provider === "workersai") {
    const { workersStream } = await workersai();
    yield* workersStream(config.model, messages, config.temperature);
    return;
  }
  const { url, headers, body } = buildRequest(config, messages, true);
  const res = await postWithRetry(url, { method: "POST", headers, body }, config.provider);
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
