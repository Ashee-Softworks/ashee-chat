/**
 * The model host, spoken to from the server only.
 *
 * This module never runs in a browser. It reads the host from the environment, lists the
 * models the host is holding, and streams one generation back. It does not summarise, retry
 * with a rewritten prompt, or hide a failure: a host that did not answer is reported as a
 * host that did not answer, because the alternative is an interface that looks like it is
 * thinking when it is actually disconnected.
 */
import type { ChatMessage, ModelInfo } from "./types";

/** Where the host is. A variable rather than a constant, because it is per-machine. */
export function hostUrl(): string {
  return (process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434").replace(/\/+$/, "");
}

/** How long a generation may take before it is abandoned. */
function timeoutMs(): number {
  const seconds = Number.parseInt(process.env.OLLAMA_TIMEOUT_SECONDS ?? "300", 10);
  return (Number.isFinite(seconds) && seconds > 0 ? seconds : 300) * 1000;
}

/** The model chosen when the interface opens. */
export function defaultModel(): string {
  return process.env.DEFAULT_MODEL ?? "";
}

/** One entry of the host's tag list, as the host sends it. */
interface TaggedModel {
  name?: string;
  size?: number;
  modified_at?: string;
  details?: { parameter_size?: string; quantization_level?: string };
}

/**
 * The models the host actually holds.
 *
 * A host that is not running is not an exception here — it is a reported state. An interface
 * that throws on a disconnected host cannot tell the person which host it tried, which is
 * the only useful thing to say.
 */
export async function listModels(): Promise<{
  reachable: boolean;
  version?: string;
  models: ModelInfo[];
  problem?: string;
}> {
  try {
    const [tagsResponse, versionResponse] = await Promise.all([
      fetch(`${hostUrl()}/api/tags`, { signal: AbortSignal.timeout(5_000), cache: "no-store" }),
      fetch(`${hostUrl()}/api/version`, { signal: AbortSignal.timeout(5_000), cache: "no-store" }),
    ]);

    if (!tagsResponse.ok) {
      return {
        reachable: false,
        models: [],
        problem: `${hostUrl()} answered HTTP ${tagsResponse.status} for its model list`,
      };
    }

    const payload = (await tagsResponse.json()) as { models?: TaggedModel[] };
    const models: ModelInfo[] = (payload.models ?? []).map((entry) => ({
      name: entry.name ?? "(unnamed)",
      size: entry.size ?? 0,
      parameterSize: entry.details?.parameter_size ?? "",
      quantization: entry.details?.quantization_level ?? "",
      modifiedAt: entry.modified_at ?? "",
    }));

    let version: string | undefined;
    if (versionResponse.ok) {
      const versionPayload = (await versionResponse.json()) as { version?: string };
      version = versionPayload.version;
    }

    return { reachable: true, version, models };
  } catch (error) {
    return {
      reachable: false,
      models: [],
      problem: `${hostUrl()} did not answer: ${(error as Error).message}`,
    };
  }
}

/**
 * Ask the host for one generation, and hand back its stream.
 *
 * The response body is returned exactly as the host sent it — newline-delimited JSON, one
 * object per token — and the caller relays it. Nothing is parsed and re-encoded on the way
 * through, so a field the host adds is a field the browser can see without this file being
 * changed first.
 */
export async function streamChat(
  model: string,
  messages: ChatMessage[],
): Promise<{ ok: true; body: ReadableStream<Uint8Array> } | { ok: false; problem: string }> {
  if (model.trim().length === 0) {
    return { ok: false, problem: "no model was named" };
  }

  try {
    const response = await fetch(`${hostUrl()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages, stream: true }),
      signal: AbortSignal.timeout(timeoutMs()),
    });

    if (!response.ok || response.body === null) {
      const detail = await response.text().catch(() => "");
      return {
        ok: false,
        problem: `${hostUrl()} answered HTTP ${response.status}${detail ? `: ${detail.slice(0, 400)}` : ""}`,
      };
    }

    return { ok: true, body: response.body };
  } catch (error) {
    return {
      ok: false,
      problem: `${hostUrl()} could not be reached: ${(error as Error).message}`,
    };
  }
}
