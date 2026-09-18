/**
 * Conversations, held in the browser.
 *
 * There is no database and no server-side session, and that is a decision rather than a gap:
 * a chat log that lives on a server is a chat log someone else can read, and this application
 * exists partly to demonstrate the opposite. What the person typed stays in this browser
 * until they clear it.
 *
 * The storage key carries a version. A shape change is a new key rather than a migration,
 * because the alternative is a parser that has to understand every shape the application has
 * ever written.
 */
import type { Conversation, Turn } from "./types";

const STORAGE_KEY = "ashee-chat/conversations/v1";

/** True when storage is usable. A browser with storage disabled is a browser, not an error. */
function available(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage !== null;
  } catch {
    return false;
  }
}

/** Everything stored, newest first. A corrupt entry is dropped rather than thrown over. */
export function loadConversations(): Conversation[] {
  if (!available()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Conversation[])
      .filter(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          Array.isArray(entry.turns),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return [];
  }
}

/** Write every conversation back. Called after each completed turn, not during one. */
export function saveConversations(conversations: Conversation[]): void {
  if (!available()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, 200)));
  } catch {
    // A full or read-only store is not a reason to lose the conversation on screen.
  }
}

/** Remove everything. The interface asks first; this function does not. */
export function clearAll(): void {
  if (!available()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above: nothing useful to do, and nothing to tell the person that they cannot see.
  }
}

/** A stable id without pulling in a dependency. */
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** A fresh, empty conversation. */
export function newConversation(model: string): Conversation {
  const now = Date.now();
  return {
    id: newId(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    model,
    turns: [],
  };
}

/**
 * A title taken from the first thing the person said.
 *
 * The first line only, cut at a word boundary: a title that ends mid-word reads as a bug,
 * and a title taken from the model's answer would name the conversation after the reply
 * rather than the question.
 */
export function titleFrom(text: string, max = 48): string {
  const firstLine = text.trim().split("\n")[0] ?? "";
  const collapsed = firstLine.replace(/\s+/g, " ").trim();
  if (collapsed.length === 0) return "New chat";
  if (collapsed.length <= max) return collapsed;
  const cut = collapsed.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The conversation with this id, or `null`. */
export function findConversation(
  conversations: Conversation[],
  id: string | null,
): Conversation | null {
  if (id === null) return null;
  return conversations.find((entry) => entry.id === id) ?? null;
}

/** Replace one turn inside one conversation, immutably. */
export function replaceTurn(
  conversations: Conversation[],
  conversationId: string,
  turnId: string,
  update: (turn: Turn) => Turn,
): Conversation[] {
  return conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    return {
      ...conversation,
      turns: conversation.turns.map((turn) => (turn.id === turnId ? update(turn) : turn)),
      updatedAt: Date.now(),
    };
  });
}
