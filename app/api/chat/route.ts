/**
 * POST /api/chat — one generation, streamed.
 *
 * The host speaks newline-delimited JSON. This route re-emits it as newline-delimited JSON
 * of this application's own event shape, so the browser gets a small closed vocabulary
 * (`token`, `usage`, `error`) instead of the host's full object graph. Every token the host
 * produced is forwarded; none is dropped, reordered or rewritten.
 */
import { streamChat } from "@/lib/ollama";
import type { ChatMessage, StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One line of the host's stream, as far as this route reads it. */
interface HostChunk {
  message?: { content?: string };
  done?: boolean;
  prompt_eval_count?: number;
  eval_count?: number;
  total_duration?: number;
  error?: string;
}

export async function POST(request: Request): Promise<Response> {
  let payload: { model?: string; messages?: ChatMessage[] };
  try {
    payload = (await request.json()) as { model?: string; messages?: ChatMessage[] };
  } catch {
    return Response.json({ error: "the request body was not JSON" }, { status: 400 });
  }

  const model = String(payload.model ?? "").trim();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (messages.length === 0) {
    return Response.json({ error: "no messages were sent" }, { status: 400 });
  }

  const started = Date.now();
  const opened = await streamChat(model, messages);
  if (!opened.ok) {
    // The failure is streamed in the same shape as a success, so the browser has exactly one
    // code path for reading an answer. A separate error status would be a second path.
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: "error", message: opened.problem })}\n`));
        controller.close();
      },
    });
    return new Response(body, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" },
    });
  }

  const reader = opened.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";
  // The host reports its token counts once, on the last chunk. They are held here until the
  // stream ends, because a usage event that arrives before the answer has finished would be
  // read as a total for a partial answer.
  let usage = { promptTokens: 0, completionTokens: 0 };

  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const emit = (event: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));

      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          // A final line without a trailing newline is still a line. Dropping it would drop
          // the token, which is the one thing this route must never do.
          if (buffered.trim().length > 0) {
            usage = readUsage(buffered, usage);
            const tail = parseLine(buffered);
            if (tail) emit(tail);
          }
          emit({
            type: "usage",
            promptTokens: usage.promptTokens,
            completionTokens: usage.completionTokens,
            totalMs: Date.now() - started,
          });
          controller.close();
          return;
        }

        buffered += decoder.decode(value, { stream: true });
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";

        let produced = false;
        for (const line of lines) {
          usage = readUsage(line, usage);
          const event = parseLine(line);
          if (event) {
            emit(event);
            produced = true;
          }
        }
        if (produced) return;
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}

/** Turn one line of the host's stream into an event, or nothing if it carried no content. */
function parseLine(line: string): StreamEvent | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) return null;

  let chunk: HostChunk;
  try {
    chunk = JSON.parse(trimmed) as HostChunk;
  } catch {
    // A partial line is not an error; it is a token split across two reads.
    return null;
  }

  if (typeof chunk.error === "string" && chunk.error.length > 0) {
    return { type: "error", message: chunk.error };
  }

  const text = chunk.message?.content;
  if (typeof text === "string" && text.length > 0) {
    return { type: "token", text };
  }

  return null;
}

/** Take the token counts off a line if it carries them, and otherwise keep what we had. */
function readUsage(line: string, previous: { promptTokens: number; completionTokens: number }) {
  const trimmed = line.trim();
  if (trimmed.length === 0 || !trimmed.includes("count")) return previous;
  try {
    const chunk = JSON.parse(trimmed) as HostChunk;
    return {
      promptTokens: typeof chunk.prompt_eval_count === "number" ? chunk.prompt_eval_count : previous.promptTokens,
      completionTokens: typeof chunk.eval_count === "number" ? chunk.eval_count : previous.completionTokens,
    };
  } catch {
    return previous;
  }
}
