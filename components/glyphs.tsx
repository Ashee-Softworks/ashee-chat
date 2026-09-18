import type { ReactNode } from "react";

/**
 * The glyphs the interface draws.
 *
 * They are inline SVG rather than an icon dependency. AsheeUI ships an icon set, but it is
 * reachable only through a private path (`asheeui/dist/icons`) and is not re-exported from
 * the package root — importing from there would couple this application to a file layout
 * that is not part of the library's public surface. The eight shapes this interface needs
 * are written out here instead, which is a few lines and no coupling.
 *
 * Every glyph inherits `currentColor` and sizes from the font, so a glyph placed beside text
 * matches that text without a prop.
 */

/** Props every glyph takes. */
interface GlyphProps {
  className?: string;
}

/** A plus. Used for a new conversation. */
export function PlusGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-4 w-4"}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** An arrow pointing up. The send action. */
export function SendGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-5 w-5"}>
      <path
        d="M12 19V5m0 0l-6 6m6-6l6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A four-pointed spark. Marks the assistant's turn, and marks nothing else. */
export function SparkGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-5 w-5"}>
      <path
        d="M12 2.5l2.2 6.1 6.1 2.2-6.1 2.2L12 19l-2.2-6.1L3.7 10.8l6.1-2.2L12 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}

/** A speech bubble. Used for a conversation in the rail. */
export function BubbleGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-4 w-4"}>
      <path
        d="M4 5.5h16v10.5H9l-5 4V5.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A chip. Marks the model that produced an answer. */
export function ChipGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-3.5 w-3.5"}>
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A clipboard. Used for the copy action on an answer. */
export function CopyGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-3.5 w-3.5"}>
      <rect x="9" y="9" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 6.5V5a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** A stop square. Cancels a generation in flight. */
export function StopGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-4 w-4"}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
    </svg>
  );
}

/** A panel. Toggles the rail. */
export function PanelGlyph({ className }: GlyphProps): ReactNode {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className ?? "h-5 w-5"}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.5 4v16" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
