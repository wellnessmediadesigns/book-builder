/**
 * Cloudflare Workers AI — runs through the `AI` binding (no API key, free tier).
 * Speaks the binding's native shape, not HTTP, so it lives outside providers.ts.
 * Available when running on Cloudflare (deployed Worker or `wrangler dev`); in
 * plain `next dev` without a Cloudflare context the binding is absent and we
 * surface a clear, actionable error.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AiMessage } from "./types";
import { AiError } from "./providers";

type WorkersAi = {
  run: (
    model: string,
    inputs: { messages: AiMessage[]; stream?: boolean; max_tokens?: number; temperature?: number },
  ) => Promise<{ response?: string } | ReadableStream<Uint8Array>>;
};

function getBinding(): WorkersAi | null {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>;
    return (env.AI as WorkersAi) ?? null;
  } catch {
    return null;
  }
}

export function workersAiAvailable(): boolean {
  return getBinding() !== null;
}

const NO_BINDING =
  "Cloudflare AI isn't available here. It works once deployed (or under `wrangler dev`). For local `next dev`, pick OpenAI or OpenRouter in Settings.";

/** Workers AI returns text under different keys across models — read them all. */
function extractText(res: unknown): string | null {
  if (typeof res === "string") return res;
  if (!res || typeof res !== "object") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = res as any;
  if (typeof r.response === "string") return r.response;
  if (Array.isArray(r.response)) return r.response.join("");
  if (r.result && typeof r.result.response === "string") return r.result.response;
  const choice = r.choices?.[0];
  if (typeof choice?.message?.content === "string") return choice.message.content;
  if (typeof choice?.text === "string") return choice.text;
  if (typeof r.text === "string") return r.text;
  if (typeof r.output_text === "string") return r.output_text;
  if (typeof r.generated_text === "string") return r.generated_text;
  return null;
}

export async function workersComplete(
  model: string,
  messages: AiMessage[],
  temperature: number,
): Promise<string> {
  const ai = getBinding();
  if (!ai) throw new AiError(NO_BINDING, "no_binding");
  let res: { response?: string } | ReadableStream<Uint8Array>;
  try {
    res = await ai.run(model, { messages, temperature, max_tokens: 4096 });
  } catch (e) {
    throw new AiError(workersErr(e, model), "workersai");
  }
  const text = extractText(res);
  if (text === null) {
    const shape = JSON.stringify(res)?.slice(0, 240) ?? String(res);
    throw new AiError(`Cloudflare AI returned an unexpected response (${shape}).`, "empty");
  }
  return text.trim();
}

export async function* workersStream(
  model: string,
  messages: AiMessage[],
  temperature: number,
): AsyncGenerator<string> {
  const ai = getBinding();
  if (!ai) throw new AiError(NO_BINDING, "no_binding");

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = (await ai.run(model, {
      messages,
      stream: true,
      temperature,
      max_tokens: 4096,
    })) as ReadableStream<Uint8Array>;
  } catch (e) {
    throw new AiError(workersErr(e, model), "workersai");
  }

  const reader = stream.getReader();
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
        // Workers AI emits { response: "..." }; tolerate OpenAI-style deltas too.
        const delta =
          (typeof json.response === "string" ? json.response : undefined) ??
          json?.choices?.[0]?.delta?.content ??
          json?.choices?.[0]?.text ??
          (typeof json.token?.text === "string" ? json.token.text : undefined);
        if (typeof delta === "string" && delta) yield delta;
      } catch {
        // ignore keep-alive frames
      }
    }
  }
}

function workersErr(e: unknown, model: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not.*found|No such model|invalid model/i.test(msg)) {
    return `Model "${model}" isn't available on Workers AI. Check the id at developers.cloudflare.com/workers-ai/models.`;
  }
  if (/capacity|429|rate/i.test(msg)) {
    return "Cloudflare AI is rate-limited right now (free tier is 10,000 requests/day). Try again shortly.";
  }
  return `Cloudflare AI request failed: ${msg.slice(0, 160)}`;
}
