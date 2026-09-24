# ashee-chat

A chat interface that talks **straight to a model running on this machine**.

Next.js App Router, [AsheeUI](https://asheeui.com) 2.0.0, Tailwind v4. There is no account,
no proxy, no telemetry and no second hop: the browser calls this application's own route
handlers, and those handlers call the model host directly. A conversation is stored in the
browser's `localStorage` and nowhere else.

## Run it

```bash
npm install
cp .env.example .env.local     # adjust the host if it is not the default
npm run dev                    # http://localhost:3100
```

The model host must be up. With Ollama, `ollama serve` and at least one pulled model:

```bash
ollama pull qwen2.5-coder:0.5b
ollama list
```

If the host is not answering, the interface says so — in the rail, and in place of the
greeting — rather than accepting a message it cannot send.

## Configuration

| Variable | Default | What it is |
|---|---|---|
| `OLLAMA_HOST` | `http://127.0.0.1:11434` | Where the model host is listening |
| `OLLAMA_TIMEOUT_SECONDS` | `300` | How long one generation may take before it is abandoned |
| `DEFAULT_MODEL` | *(empty)* | The model selected on open, if it is installed |

Every value is per-machine, none is a secret, and `.env*` is ignored — `.env.example` is the
only environment file committed, and it carries keys with no real values.

## How a message travels

```
browser  ──POST /api/chat──▶  route handler  ──POST /api/chat──▶  model host
   ▲                                │                                   │
   └────── NDJSON: token, usage ────┘◀──── NDJSON: one chunk/token ──────┘
```

Two things are deliberate.

**The events are newline-delimited JSON, not server-sent events.** The client reads them with
a plain reader and a `split("\n")`. A stream that needs a parser library to deliver one token
is a stream with a dependency it did not need.

**A failure is streamed in the same shape as a success.** A host that is down produces an
`{"type":"error"}` event on a `200` response, so the browser has exactly one code path for
reading an answer. A separate HTTP status would be a second path, and a second path is a
second place for a failure to be swallowed.

## What the interface refuses to fake

- **No token is dropped.** A line split across two reads is reassembled. A final line without
  a trailing newline is still read. The route emits every token the host produced, in order,
  unedited.
- **A dead host looks dead.** There is no spinner that spins forever and no optimistic
  "thinking…" over a host that never answered.
- **The text renderer understands three things** — fenced code, inline code and bold — and
  prints everything else exactly as it arrived. It is not a half-written Markdown parser,
  because a half-written one silently eats a line of someone's answer.

## How it is built

| Path | What it does |
|---|---|
| `app/api/chat/route.ts` | Relays one generation as NDJSON `token` / `usage` / `error` events |
| `app/api/models/route.ts` | Reports what the host is holding, and whether it is up |
| `app/page.tsx` | The page: one client component, no server-side fetch |
| `app/providers.tsx` | The AsheeUI provider, in its own file because context needs a client component |
| `components/workspace.tsx` | All of the conversation state, and the streaming loop |
| `components/rail.tsx` | The conversation list, grouped by when each was last touched |
| `components/composer.tsx` | The growing textarea, and the send/stop button |
| `components/transcript.tsx` | A turn; the assistant's is not a bubble |
| `components/marks.tsx` | The three-things text renderer |
| `lib/ollama.ts` | The model host, spoken to from the server only |
| `lib/store.ts` | Conversations in `localStorage`, versioned key |
| `lib/stream.ts` | Reading the NDJSON answer |

## Privacy

The whole point of the arrangement is that nothing leaves this machine. Two consequences are
worth stating plainly, because both are load-bearing:

1. **Conversations are in the browser, not on a server.** `lib/store.ts` is the only
   persistence in the project, and it is `localStorage`.
2. **The route handlers hold no state between requests.** They read `OLLAMA_HOST`, stream one
   answer, and forget it. Nothing is logged.

## Licence

**BSD Zero Clause License** (`0BSD`) — Copyright (C) 2026 Ashee Softworks. The licence is five
lines, and the whole grant is one sentence of it in [`LICENSE`](LICENSE):

> Permission to use, copy, modify, and/or distribute this software for any purpose with or
> without fee is hereby granted.

That is everything. No attribution is required, no changes have to be published, and anyone who
takes a copy may close it, relicense it and sell it. It is deliberately the most permissive
licence there is — the one Google uses for code it wants people to use without thinking about
terms — which is why there is nothing on this page telling you what you must do.

**Changed on 2026-09-24.** Before that this repository carried `PROPRIETARY AND CONFIDENTIAL —
ALL RIGHTS RESERVED / NO LICENSE IS GRANTED`, and **that wording remains in every commit before
the change**: a later commit does not unpublish it. An open grant cannot be recalled either, so
every copy taken under 0BSD stays free, for anyone, for good. Both directions are permanent.

