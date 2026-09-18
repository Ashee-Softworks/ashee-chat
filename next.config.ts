import type { NextConfig } from "next";

/**
 * The Next configuration.
 *
 * One thing is worth stating: there is no proxy and no rewrite here. The browser talks to
 * this application's own route handlers, and those route handlers talk to the model on
 * this machine. A second hop would be a second place for a message to be logged.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The route handlers read the model's host from the environment at request time.
  serverExternalPackages: [],
};

export default nextConfig;
