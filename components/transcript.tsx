"use client";

import { Chip, Typography } from "asheeui";
import { useState, type ReactNode } from "react";
import type { Turn } from "@/lib/types";
import { CopyGlyph, SparkGlyph } from "./glyphs";
import { Marks } from "./marks";

/**
 * The conversation, oldest at the top.
 *
 * A user's turn is a bubble on the right; the assistant's is not a bubble at all. That is
 * not only a visual choice — an answer is read as a document, and putting it inside a box
 * caps its width and its breathing room. The assistant's turn spans the column and carries a
 * quiet footer with what actually produced it.
 *
 * @param props - The props.
 * @param props.turns - Every turn so far.
 * @returns The transcript.
 */
export function Transcript({ turns }: { turns: Turn[] }): ReactNode {
  return (
    <div className="space-y-8 pb-4">
      {turns.map((turn) =>
        turn.role === "user" ? (
          <UserTurn key={turn.id} turn={turn} />
        ) : (
          <AssistantTurn key={turn.id} turn={turn} />
        ),
      )}
    </div>
  );
}

function UserTurn({ turn }: { turn: Turn }): ReactNode {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-[var(--color-surface-hover)] px-5 py-3">
        <Typography role="body-md" className="whitespace-pre-wrap text-[var(--color-ink)]">
          {turn.content}
        </Typography>
      </div>
    </div>
  );
}

function AssistantTurn({ turn }: { turn: Turn }): ReactNode {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(turn.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // A browser that refuses clipboard access is not a failure of the answer.
      setCopied(false);
    }
  };

  const empty = turn.content.length === 0;

  return (
    <div className="flex gap-4">
      <div className="mt-0.5 shrink-0 text-[var(--color-accent)]" aria-hidden="true">
        <SparkGlyph className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        {turn.error !== undefined ? (
          <div className="rounded-xl border border-[var(--color-hairline)] bg-[var(--color-surface)] px-4 py-3">
            <Typography role="body-sm" className="font-mono text-[var(--color-warm)]">
              {turn.error}
            </Typography>
          </div>
        ) : empty && turn.streaming === true ? (
          <Typography role="body-md" tone="muted">
            thinking…
          </Typography>
        ) : (
          <Marks text={turn.content} />
        )}

        {turn.streaming === true && !empty ? (
          <span className="caret-streaming ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 rounded-full bg-[var(--color-accent)]" />
        ) : null}

        {turn.streaming !== true && !empty ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink-soft)]"
            >
              <CopyGlyph className="h-3.5 w-3.5" />
              {copied ? "copied" : "copy"}
            </button>

            {turn.model !== undefined ? (
              <Chip size="sm">{turn.model}</Chip>
            ) : null}

            {typeof turn.durationMs === "number" ? (
              <Typography role="caption" tone="muted">
                {(turn.durationMs / 1000).toFixed(1)}s
                {typeof turn.completionTokens === "number" && turn.completionTokens > 0
                  ? ` · ${turn.completionTokens} tokens`
                  : ""}
              </Typography>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
