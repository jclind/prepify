// Shared SEO/meta constants and helpers.
//
// Why this exists (and why it's not a react-helmet "default" component):
// the app runs React 19, where react-helmet-async no longer dedupes tags by
// property — each <Helmet> renders its tags as real elements that React 19
// hoists into <head>, with NO cross-instance merge. So a global default Helmet
// plus a per-page Helmet would emit DUPLICATE og:* tags, not an override.
//
// Instead:
//   1. index.html ships static <title>/description/og/twitter tags (marked
//      data-rh-default) — the fallback that JS-less social crawlers (Facebook,
//      Slack, iMessage, LinkedIn, …) actually read, since this is a CSR SPA.
//   2. On JS boot we strip those static tags (stripStaticMeta) so the live
//      <head> won't contain both them and the per-route <Helmet> output.
//   3. Each route renders exactly one <Helmet> — the single source of truth for
//      that page's title/description/og while JS is running.

// Canonical production origin — used to build absolute URLs for social tags
// (og:image / og:url must be absolute for crawlers to resolve them).
export const SITE_URL = 'https://www.prepifymeals.com'

// Branded 1200×630 link-preview card (public/images/og-card.png).
export const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-card.png`

export const DEFAULT_TITLE = 'Prepify · Budget-friendly, healthy recipes'

export const DEFAULT_DESCRIPTION =
  "Prepify provides budget-friendly, healthy recipes that don't skimp on flavor. Find easy-to-follow recipes that include meal price and nutrition information!"

// Attribute that marks the static fallback tags in index.html.
export const STATIC_META_ATTR = 'data-rh-default'

/**
 * Remove the static fallback meta/title tags from <head>.
 *
 * Call once, synchronously, before React mounts. The tags stay in the served
 * HTML for JS-less crawlers; once our JS runs we drop them so React 19's hoisted
 * per-route tags are the only copies in the live <head> (no duplicates).
 */
export const stripStaticMeta = (doc: Document = document): void => {
  if (typeof doc === 'undefined' || !doc.head) return
  doc.head
    .querySelectorAll(`[${STATIC_META_ATTR}]`)
    .forEach(el => el.remove())
}
