/**
 * PostCSS, as Tailwind v4 expects it in a Next application: the plugin is the whole config.
 *
 * There is no `tailwind.config.js` and there is deliberately not one. Tailwind v4 discovers
 * its content from the file tree and takes its theme from CSS, and a config file left over
 * from v3 would be read by nobody and believed by everyone.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
