"use client";

import { Badge, Typography } from "asheeui";
import { useMemo, useState, type ReactNode } from "react";
import type { Conversation, HostInfo } from "@/lib/types";
import { BubbleGlyph, PanelGlyph, PlusGlyph } from "./glyphs";

/**
 * The rail: every conversation, and what is answering.
 *
 * It groups by when a conversation was last touched rather than sorting by title, because a
 * flat alphabetical list of a hundred chats is not navigable and a date is how people
 * actually remember a conversation.
 *
 * @param props - The props.
 * @param props.conversations - Every conversation, newest first.
 * @param props.activeId - The conversation on screen, if any.
 * @param props.onSelect - Called with the conversation to open.
 * @param props.onNew - Called to start a new conversation.
 * @param props.onCollapse - Called to hide the rail.
 * @param props.host - What the model host reported.
 * @returns The rail.
 */
export function Rail({
  conversations,
  activeId,
  onSelect,
  onNew,
  onCollapse,
  host,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onCollapse: () => void;
  host: HostInfo | null;
}): ReactNode {
  const [filter, setFilter] = useState("");
  const groups = useMemo(() => groupByWhen(conversations, filter), [conversations, filter]);

  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col bg-[var(--color-rail)]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Hide the sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-ink)]"
        >
          <PanelGlyph className="h-5 w-5" />
        </button>
        <Typography role="label" className="tracking-[0.2em] text-[var(--color-ink-soft)] uppercase">
          ashee
        </Typography>
        <span className="h-9 w-9" />
      </div>

      <div className="px-3">
        <button
          type="button"
          onClick={onNew}
          className="flex w-full items-center gap-2.5 rounded-full bg-[var(--color-surface-hover)] px-4 py-2.5 text-left text-[13px] text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-active)]"
        >
          <PlusGlyph className="h-4 w-4 shrink-0" />
          New chat
        </button>
      </div>

      <div className="px-3 pt-3">
        <input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
          className="w-full rounded-full bg-transparent px-4 py-2 text-[13px] text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-faint)] focus:bg-[var(--color-surface-hover)]"
        />
      </div>

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {groups.length === 0 ? (
          <Typography role="caption" tone="muted" className="block px-3 py-6">
            {filter.length > 0 ? "No chat matches that." : "No chats yet."}
          </Typography>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              <Typography
                role="overline"
                tone="muted"
                className="block px-3 pt-3 pb-1.5 text-[10px] tracking-[0.14em] uppercase"
              >
                {group.label}
              </Typography>
              <ul>
                {group.items.map((conversation) => {
                  const active = conversation.id === activeId;
                  return (
                    <li key={conversation.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(conversation.id)}
                        aria-current={active ? "true" : undefined}
                        className={
                          "flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] transition-colors " +
                          (active
                            ? "bg-[var(--color-surface-active)] text-[var(--color-ink)]"
                            : "text-[var(--color-ink-soft)] hover:bg-[var(--color-surface-hover)]")
                        }
                      >
                        <BubbleGlyph className="h-3.5 w-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{conversation.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <HostFooter host={host} />
    </aside>
  );
}

/** What is answering, and whether it is answering at all. */
function HostFooter({ host }: { host: HostInfo | null }): ReactNode {
  if (host === null) {
    return (
      <div className="border-t border-[var(--color-hairline)] px-4 py-3">
        <Typography role="caption" tone="muted">
          asking the host…
        </Typography>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-hairline)] px-4 py-3">
      {host.reachable ? (
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
          <Typography role="caption" tone="muted" className="truncate">
            {host.models.length} model{host.models.length === 1 ? "" : "s"} on this machine
          </Typography>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Badge color="warning" size="sm">
            host offline
          </Badge>
          <Typography role="caption" tone="muted" className="block break-words">
            {host.problem ?? `${host.host} did not answer`}
          </Typography>
        </div>
      )}
    </div>
  );
}

/** Label, then the conversations that belong under it. */
interface Group {
  label: string;
  items: Conversation[];
}

/**
 * Group by when a conversation was last touched.
 *
 * Boundaries are calendar days, not elapsed hours: "Yesterday" means yesterday, which is how
 * a person reading the list understands the word.
 */
function groupByWhen(conversations: Conversation[], filter: string): Group[] {
  const needle = filter.trim().toLowerCase();
  const matching =
    needle.length === 0
      ? conversations
      : conversations.filter(
          (conversation) =>
            conversation.title.toLowerCase().includes(needle) ||
            conversation.turns.some((turn) => turn.content.toLowerCase().includes(needle)),
        );

  const today = startOfDay(new Date());
  const yesterday = today - 86_400_000;
  const week = today - 7 * 86_400_000;

  const buckets: Group[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Earlier", items: [] },
  ];

  for (const conversation of matching) {
    if (conversation.updatedAt >= today) buckets[0].items.push(conversation);
    else if (conversation.updatedAt >= yesterday) buckets[1].items.push(conversation);
    else if (conversation.updatedAt >= week) buckets[2].items.push(conversation);
    else buckets[3].items.push(conversation);
  }

  return buckets.filter((bucket) => bucket.items.length > 0);
}

/** Midnight today, in this browser's timezone. */
function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
