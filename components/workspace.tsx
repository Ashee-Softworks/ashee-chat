"use client";

import { Typography } from "asheeui";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  findConversation,
  loadConversations,
  newConversation,
  newId,
  replaceTurn,
  saveConversations,
  titleFrom,
} from "@/lib/store";
import { streamAnswer } from "@/lib/stream";
import type { ChatMessage, Conversation, HostInfo, Turn } from "@/lib/types";
import { Composer } from "./composer";
import { PanelGlyph, SparkGlyph } from "./glyphs";
import { Rail } from "./rail";
import { Transcript } from "./transcript";

/** How many earlier turns are sent back with each new message. */
const HISTORY_WINDOW = 20;

/**
 * The conversation, end to end.
 *
 * All of the state lives here, and none of it lives on a server. A conversation is created
 * on the first message rather than when "New chat" is pressed, so a chat someone starts and
 * abandons does not leave an empty row in the rail.
 */
export function Workspace(): ReactNode {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState("");
  const [host, setHost] = useState<HostInfo | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [railOpen, setRailOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);

  const abort = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  // Read what was stored here, once, on the client. Reading during render would produce a
  // different tree on the server and in the browser, which React would then complain about.
  useEffect(() => {
    setConversations(loadConversations());
    setLoaded(true);
  }, []);

  // Ask what is answering.
  useEffect(() => {
    let cancelled = false;
    const ask = async () => {
      try {
        const response = await fetch("/api/models", { cache: "no-store" });
        const payload = (await response.json()) as HostInfo & { suggestedModel: string };
        if (cancelled) return;
        setHost(payload);
        setModel((current) => current || payload.suggestedModel);
      } catch (error) {
        if (cancelled) return;
        setHost({
          reachable: false,
          host: "the server",
          models: [],
          problem: `the model list could not be read: ${(error as Error).message}`,
        });
      }
    };
    void ask();
    return () => {
      cancelled = true;
    };
  }, []);

  // Write back after a change, never during one.
  useEffect(() => {
    if (loaded) saveConversations(conversations);
  }, [conversations, loaded]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversations, activeId]);

  const active = findConversation(conversations, activeId);

  const stop = useCallback(() => {
    abort.current?.abort();
    abort.current = null;
    setBusy(false);
  }, []);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (text.length === 0 || busy) return;

    const chosenModel = model || host?.models[0]?.name || "";
    const userTurn: Turn = { id: newId(), role: "user", content: text };
    const answerTurn: Turn = {
      id: newId(),
      role: "assistant",
      content: "",
      model: chosenModel,
      streaming: true,
    };

    // The conversation this message belongs to: the open one, or a new one.
    let conversation: Conversation;
    if (active !== null) {
      conversation = { ...active, turns: [...active.turns, userTurn, answerTurn], updatedAt: Date.now() };
    } else {
      conversation = newConversation(chosenModel);
      conversation.title = titleFrom(text);
      conversation.turns = [userTurn, answerTurn];
    }

    const history: ChatMessage[] = conversation.turns
      .slice(0, -1) // the placeholder is not part of the conversation yet
      .slice(-HISTORY_WINDOW)
      .map((turn) => ({ role: turn.role, content: turn.content }));

    setConversations((previous) => [conversation, ...previous.filter((entry) => entry.id !== conversation.id)]);
    setActiveId(conversation.id);
    setDraft("");
    setBusy(true);

    const controller = new AbortController();
    abort.current = controller;
    const conversationId = conversation.id;
    const answerId = answerTurn.id;

    await streamAnswer(
      chosenModel,
      history,
      (event) => {
        if (event.type === "token") {
          setConversations((previous) =>
            replaceTurn(previous, conversationId, answerId, (turn) => ({
              ...turn,
              content: turn.content + event.text,
            })),
          );
          return;
        }

        if (event.type === "usage") {
          setConversations((previous) =>
            replaceTurn(previous, conversationId, answerId, (turn) => ({
              ...turn,
              streaming: false,
              durationMs: event.totalMs,
              promptTokens: event.promptTokens,
              completionTokens: event.completionTokens,
            })),
          );
          return;
        }

        setConversations((previous) =>
          replaceTurn(previous, conversationId, answerId, (turn) => ({
            ...turn,
            streaming: false,
            error: event.message,
          })),
        );
      },
      controller.signal,
    );

    // Whether the stream ended by itself, by a stop, or by an error, the turn is no longer
    // streaming. Leaving it marked would leave a caret blinking at the reader forever.
    setConversations((previous) =>
      replaceTurn(previous, conversationId, answerId, (turn) => ({ ...turn, streaming: false })),
    );
    abort.current = null;
    setBusy(false);
  }, [active, busy, draft, host, model]);

  const startNew = useCallback(() => {
    stop();
    setActiveId(null);
    setDraft("");
  }, [stop]);

  const hostReady = host !== null && host.reachable && host.models.length > 0;

  return (
    <div className="flex h-full">
      {railOpen ? (
        <Rail
          conversations={conversations}
          activeId={activeId}
          onSelect={(id) => {
            setActiveId(id);
            const found = findConversation(conversations, id);
            if (found !== null && found.model.length > 0) setModel(found.model);
          }}
          onNew={startNew}
          onCollapse={() => setRailOpen(false)}
          host={host}
        />
      ) : null}

      <main className="flex h-full min-w-0 flex-1 flex-col">
        <TopBar
          railOpen={railOpen}
          onOpenRail={() => setRailOpen(true)}
          title={active?.title ?? "New chat"}
        />

        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="mx-auto w-full max-w-3xl pt-6">
            {active === null || active.turns.length === 0 ? (
              <Greeting hasModel={hostReady} host={host} />
            ) : (
              <Transcript turns={active.turns} />
            )}
            <div ref={bottom} />
          </div>
        </div>

        <div className="px-6 pt-2 pb-6">
          <div className="mx-auto w-full max-w-3xl">
            <Composer
              value={draft}
              onChange={setDraft}
              onSend={() => void send()}
              onStop={stop}
              busy={busy}
              models={host?.models ?? []}
              model={model}
              onModelChange={setModel}
              disabled={!hostReady}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

/** The bar above the transcript: where you are, and how to get the rail back. */
function TopBar({
  railOpen,
  onOpenRail,
  title,
}: {
  railOpen: boolean;
  onOpenRail: () => void;
  title: string;
}): ReactNode {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 px-4">
      {railOpen ? null : (
        <button
          type="button"
          onClick={onOpenRail}
          aria-label="Show the sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
        >
          <PanelGlyph className="h-5 w-5" />
        </button>
      )}
      <Typography
        role="label"
        tone="muted"
        className="min-w-0 flex-1 truncate text-[13px] font-normal"
      >
        {title}
      </Typography>
    </header>
  );
}

/**
 * What is shown before anything has been said.
 *
 * The greeting is the only decorative thing in the interface, and it carries one piece of
 * information rather than a slogan: when the host is not answering, this is where the person
 * finds out, before they type a message into a box that cannot reply.
 */
function Greeting({ hasModel, host }: { hasModel: boolean; host: HostInfo | null }): ReactNode {
  return (
    <div className="flex min-h-[52vh] flex-col justify-center py-10">
      <div className="mb-6 text-[var(--color-accent)]">
        <SparkGlyph className="h-8 w-8" />
      </div>

      <Typography role="display" as="h1" className="text-aurora text-[40px] leading-tight font-medium">
        Hello.
      </Typography>
      <Typography role="heading-md" as="p" tone="muted" className="mt-2 font-normal">
        What would you like to work on?
      </Typography>

      <div className="mt-8 space-y-2">
        {hasModel ? (
          <Typography role="body-sm" tone="muted">
            Running on this machine. Your messages go to the model on this host and are stored
            in this browser — nowhere else.
          </Typography>
        ) : (
          <Typography role="body-sm" className="text-[var(--color-warm)]">
            {host === null
              ? "Looking for a model on this machine…"
              : (host.problem ??
                `${host.host} answered, but it is holding no models. Pull one first, for example: ollama pull qwen2.5-coder:0.5b`)}
          </Typography>
        )}
      </div>
    </div>
  );
}
