/**
 * lib/site.ts — Centralized site-wide metadata.
 *
 * All page titles, descriptions, and the app name live here.
 * To rebrand, change `name` and `description` — everything else updates automatically.
 *
 * Title template: "<Page Name> — DLT Pay"
 * Root (no page segment): "DLT Pay — Secure Payment Links"
 */

export const site = {
  /** Short app name — used in the nav bar, browser tab, and OG tags. */
  name: "DLT Pay",

  /** One-line description — used in the root layout and shared meta tags. */
  description: "Secure, shareable payment links powered by DLT.",

  /**
   * Next.js title template.
   * Pages export `title: "Login"` and the browser shows "Login — DLT Pay".
   * The root layout uses `default` (no page segment active).
   */
  titleTemplate: {
    template: "%s — DLT Pay",
    default: "DLT Pay — Secure Payment Links",
  },
} as const;
