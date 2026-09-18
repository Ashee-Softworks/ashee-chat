import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ashee",
  description:
    "A chat interface that talks straight to a model running on this machine. Nothing is sent anywhere else.",
};

export const viewport: Viewport = {
  themeColor: "#131314",
  width: "device-width",
  initialScale: 1,
};

/**
 * The document shell.
 *
 * It renders almost nothing on purpose. The provider wraps the tree so AsheeUI's theme and
 * component configuration resolve everywhere below it, and the interface itself is a client
 * component because a conversation is browser state. There is no server-side data to fetch
 * here, so nothing is fetched here.
 *
 * @param props - The children to render.
 * @param props.children - The page.
 * @returns The document shell.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
