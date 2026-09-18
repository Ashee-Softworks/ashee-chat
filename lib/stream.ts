/**
 * Reading the answer.
 *
 * The route sends newline-delimited JSON. This reads it a chunk at a time and calls back per
 * event, so a token reaches the screen as it arrives rather than when the answer is finished.
 * A line split across two reads is reassembled rather than dropped — that is the whole
 * reason `buffered` exists.
 */
import type { ChatMessage, StreamEvent } from "./types";

/** Called once per event, in the order the host produced them. */
export type OnEvent = (event: StreamEvent) => void;

/**
 * Send a conversation to the model and report its answer as it arrives.
 *
 * @param model - The model to ask.
 * @param messages - The conversation so far, oldest first.
 * @param onEvent - Called per event.
 * @param signal - Aborts the request.
 * @returns Nothing. A failure is delivered as an `error` event, not as a thrown exception,
 *   so the caller has one path for both.
 */
export async function streamAnswer(
  model: string,
  messages: ChatMessage[],
  onEvent: OnEvent,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model, messages }),
      signal,
    });
  } catch (error) {
    onEvent({ type: "error", message: `the request did not leave: ${(error as Error).message}` });
    return;
  }

  if (!response.ok) {
    onEvent({ type: "error", message: `the server answered HTTP ${response.status}` });
    return;
  }
  if (response.body === null) {
    onEvent({ type: "error", message: "the server sent no body" });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffered = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffered += done ? decoder.decode() : decoder.decode(value, { stream: true });

      const lines = buffered.split("\n");
      buffered = done ? "" : (lines.pop() ?? "");

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          onEvent(JSON.parse(trimmed) as StreamEvent);
        } catch {
          // A line that is not an event is not an answer, and guessing at it would be worse
          // than skipping it.
        }
      }

      if (done) break;
    }
  } catch (error) {
    if ((error as Error).name !== "AbortError") {
      onEvent({ type: "error", message: `the stream stopped: ${(error as Error).message}` });
    }
  } finally {
    reader.releaseLock();
  }
}
