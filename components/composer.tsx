"use client";

import { Typography } from "asheeui";
import { useEffect, useRef, type ReactNode } from "react";
import type { ModelInfo } from "@/lib/types";
import { ChipGlyph, SendGlyph, StopGlyph } from "./glyphs";

/**
 * The composer.
 *
 * A textarea that grows with what is typed, and one action button that is *send* while idle
 * and *stop* while an answer is arriving. The button changes rather than gaining a neighbour,
 * because the two actions are never both available and two buttons would suggest otherwise.
 *
 * Enter sends, Shift+Enter makes a new line. That is the convention the people using this
 * already have in their fingers.
 */
export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  busy,
  models,
  model,
  onModelChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  busy: boolean;
  models: ModelInfo[];
  model: string;
  onModelChange: (next: string) => void;
  disabled: boolean;
}): ReactNode {
  const box = useRef<HTMLTextAreaElement | null>(null);

  // Grow to fit, up to a ceiling. Past the ceiling it scrolls, so the transcript keeps most
  // of the screen even when someone pastes a file.
  useEffect(() => {
    const element = box.current;
    if (element === null) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 220)}px`;
  }, [value]);

  const submit = () => {
    if (busy || disabled) return;
    if (value.trim().length === 0) return;
    onSend();
  };

  return (
    <div className="rounded-[28px] border border-[var(--color-hairline)] bg-[var(--color-surface)] px-5 pt-4 pb-3 transition-colors focus-within:border-[var(--color-accent-deep)]">
      <textarea
        ref={box}
        value={value}
        rows={1}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        placeholder={disabled ? "the model host is not answering" : "Ask anything"}
        aria-label="Message"
        className="max-h-[220px] w-full resize-none bg-transparent text-[15px] leading-relaxed text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] disabled:cursor-not-allowed"
      />

      <div className="mt-2 flex items-center justify-between gap-3">
        <label className="flex min-w-0 items-center gap-2 text-[var(--color-ink-faint)]">
          <ChipGlyph className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only">Model</span>
          <select
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={models.length === 0}
            className="max-w-[240px] truncate rounded-full bg-transparent text-[12px] text-[var(--color-ink-soft)] outline-none disabled:opacity-50"
          >
            {models.length === 0 ? <option value="">no models installed</option> : null}
            {models.map((entry) => (
              <option key={entry.name} value={entry.name} className="bg-[var(--color-surface)]">
                {entry.name}
                {entry.parameterSize.length > 0 ? ` · ${entry.parameterSize}` : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={busy ? onStop : submit}
          disabled={disabled || (!busy && value.trim().length === 0)}
          aria-label={busy ? "Stop generating" : "Send message"}
          className={
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors " +
            (busy
              ? "bg-[var(--color-ink-soft)] text-[var(--color-canvas)] hover:bg-[var(--color-ink)]"
              : value.trim().length === 0 || disabled
                ? "bg-[var(--color-surface-active)] text-[var(--color-ink-faint)]"
                : "bg-[var(--color-accent)] text-[var(--color-canvas)] hover:bg-[var(--color-accent-soft)]")
          }
        >
          {busy ? <StopGlyph className="h-3.5 w-3.5" /> : <SendGlyph className="h-4.5 w-4.5" />}
        </button>
      </div>

      <Typography role="caption" tone="muted" className="mt-1 block">
        Enter sends · Shift+Enter for a new line
      </Typography>
    </div>
  );
}
