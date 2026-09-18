"use client";

import { AsheeUIProvider } from "asheeui";
import type { ReactNode } from "react";

/**
 * The provider boundary.
 *
 * It has to be a client component, and it has to be its own file: `app/layout.tsx` is a
 * server component and cannot render a provider that carries React context.
 *
 * The configuration is written here rather than left at the library's defaults because this
 * is a dark, quiet application — a bordered control at the framework's default weight is too
 * loud for a surface someone reads for a long time. Only the tokens this application actually
 * overrides are set; everything else stays at the framework's fallback.
 *
 * The keys under `components` are lower-case component names, which is how the library
 * registers them. `Button` here would be silently ignored, which is the kind of mistake that
 * looks like the framework not working.
 *
 * @param props - The children to wrap.
 * @param props.children - The page.
 * @returns The wrapped tree.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AsheeUIProvider
      config={{
        defaultTheme: "dark",
        defaultRadius: "lg",
        components: {
          button: { radius: "full" },
          card: { radius: "xl", variant: "ghost" },
          textarea: { radius: "xl" },
        },
      }}
    >
      {children}
    </AsheeUIProvider>
  );
}
