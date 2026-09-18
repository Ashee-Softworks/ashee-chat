/**
 * The wire shapes, in one place, shared by the browser and the route handlers.
 *
 * They are declared once rather than twice because a client that trusts a different shape
 * from the one the server sends is a bug that only shows up at runtime, in a browser, on a
 * request that already left.
 */

/** One message in a conversation, in the shape the model expects. */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** A model the host is actually holding, as the host reported it. */
export interface ModelInfo {
  name: string;
  size: number;
  parameterSize: string;
  quantization: string;
  modifiedAt: string;
}

/** What the interface shows beside the composer, so the person knows what is answering. */
export interface HostInfo {
  reachable: boolean;
  host: string;
  version?: string;
  models: ModelInfo[];
  /** Set when the host did not answer, so the interface can say why rather than spin. */
  problem?: string;
}

/**
 * One event in the streamed answer.
 *
 * `token` arrives many times, `usage` once at the end, `error` at most once. The events are
 * newline-delimited JSON rather than server-sent events because the client reads them with
 * a plain reader, and a stream that needs a parser library to read a token is a stream with
 * a dependency it did not need.
 */
export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "usage"; promptTokens: number; completionTokens: number; totalMs: number }
  | { type: "error"; message: string };

/** One turn as the interface holds it. */
export interface Turn {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  /** Set while the answer is still arriving. */
  streaming?: boolean;
  /** Milliseconds from request to the last token, once it has finished. */
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  error?: string;
}

/** A conversation, held in the browser and nowhere else. */
export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  turns: Turn[];
}
