import type { ReactNode } from "react";

/**
 * A small, honest renderer for the model's text.
 *
 * It understands three things and says so: fenced code blocks, inline code, and bold. It is
 * not a Markdown implementation and does not pretend to be one — a half-written Markdown
 * parser is how a transcript ends up silently dropping a line of someone's answer, and a
 * dropped line in a code block is a bug the reader cannot see.
 *
 * Anything it does not recognise is printed exactly as it arrived. That is the rule: render
 * less, lose nothing.
 */

/** One piece of a parsed answer. */
type Piece =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string; language: string };

/** Split the answer into code blocks and the prose between them. */
function segment(text: string): Piece[] {
  const pieces: Piece[] = [];
  const fence = /^```([^\n`]*)\n([\s\S]*?)(?:^```[ \t]*$|$)/gm;
  let cursor = 0;

  for (let match = fence.exec(text); match !== null; match = fence.exec(text)) {
    if (match.index > cursor) {
      pieces.push({ kind: "text", value: text.slice(cursor, match.index) });
    }
    pieces.push({
      kind: "code",
      language: match[1].trim(),
      value: match[2].replace(/\n$/, ""),
    });
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    pieces.push({ kind: "text", value: text.slice(cursor) });
  }
  return pieces;
}

/** Split one run of prose into paragraphs, inline code and bold. */
function prose(value: string, keyPrefix: string): ReactNode[] {
  const output: ReactNode[] = [];
  const lines = value.split("\n");
  let paragraph: ReactNode[] = [];
  let index = 0;

  const flush = () => {
    if (paragraph.length === 0) return;
    output.push(
      <p key={`${keyPrefix}-p-${index++}`} className="leading-relaxed">
        {paragraph}
      </p>,
    );
    paragraph = [];
  };

  for (const line of lines) {
    if (line.trim().length === 0) {
      flush();
      continue;
    }
    if (paragraph.length > 0) paragraph.push(<br key={`${keyPrefix}-br-${index}-${paragraph.length}`} />);
    paragraph.push(...inline(`${line} `, `${keyPrefix}-l-${index}`));
  }
  flush();

  return output.length > 0 ? output : [<p key={`${keyPrefix}-empty`} className="leading-relaxed" />];
}

/** Inline code and bold within one line. */
function inline(line: string, keyPrefix: string): ReactNode[] {
  const output: ReactNode[] = [];
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*)/g;
  let cursor = 0;
  let index = 0;

  for (let match = pattern.exec(line); match !== null; match = pattern.exec(line)) {
    if (match.index > cursor) output.push(line.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      output.push(
        <code
          key={`${keyPrefix}-c-${index++}`}
          className="rounded-[4px] bg-[var(--color-surface-active)] px-1.5 py-0.5 font-mono text-[0.85em]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      output.push(
        <strong key={`${keyPrefix}-b-${index++}`} className="font-semibold text-[var(--color-ink)]">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < line.length) output.push(line.slice(cursor));
  return output;
}

/**
 * Render one answer.
 *
 * @param props - The props.
 * @param props.text - The answer, exactly as it arrived.
 * @returns The rendered answer.
 */
export function Marks({ text }: { text: string }): ReactNode {
  const pieces = segment(text);

  return (
    <div className="space-y-3 text-[15px] text-[var(--color-ink-soft)]">
      {pieces.map((piece, index) =>
        piece.kind === "code" ? (
          <figure
            key={`code-${index}`}
            className="overflow-hidden rounded-xl border border-[var(--color-hairline)] bg-[var(--color-canvas)]"
          >
            {piece.language.length > 0 ? (
              <figcaption className="border-b border-[var(--color-hairline)] px-4 py-1.5 font-mono text-[11px] tracking-wide text-[var(--color-ink-faint)] uppercase">
                {piece.language}
              </figcaption>
            ) : null}
            <pre className="overflow-x-auto px-4 py-3">
              <code className="font-mono text-[13px] leading-relaxed whitespace-pre">
                {piece.value}
              </code>
            </pre>
          </figure>
        ) : (
          <div key={`text-${index}`} className="space-y-2">
            {prose(piece.value, `t-${index}`)}
          </div>
        ),
      )}
    </div>
  );
}
