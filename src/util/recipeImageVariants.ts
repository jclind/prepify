/**
 * Responsive-image helpers for recipe photos (BACKLOG I1).
 *
 * Recipe images are uploaded full-resolution to Firebase Storage. The Firebase
 * "Resize Images" extension (`storage-resize-images`) generates fixed-width WebP
 * variants next to each original — see `docs/IMAGE_PIPELINE.md` for the install +
 * backfill runbook. This module turns a stored original-image URL into a
 * `srcset` over those variants so cards and the hero download an appropriately
 * sized image instead of the full original (the main mobile-LCP lever).
 *
 * Two independent safety nets keep this from ever showing a broken image:
 *   1. `VITE_IMAGE_VARIANTS_ENABLED` gates srcset emission entirely. Until the
 *      extension is installed AND existing images are backfilled, it stays off
 *      and every consumer renders only the original `src` — zero 404s, zero
 *      behaviour change from before I1. (This is why the frontend can ship and
 *      merge ahead of the owner-gated extension install.)
 *   2. Even with the flag on, consumers keep the original as the `<img src>` and
 *      fall back to it on a variant load error — covering legacy/un-backfilled
 *      images (the catalog spans more than one Storage bucket) and the brief
 *      window after an upload before the extension finishes generating variants.
 */

// Variant bounding-box widths, ascending. Each value is BOTH the extension's
// configured box width (`IMG_SIZES = "400x400,800x800,1600x1600"`) and the
// srcset `w` descriptor. This array is the single source of truth for the
// variant naming built below — keep it in lockstep with the extension config
// documented in `docs/IMAGE_PIPELINE.md`.
export const RECIPE_IMAGE_VARIANT_WIDTHS = [400, 800, 1600] as const

// Output format the extension is configured to emit (`IMAGE_TYPE=webp`).
const VARIANT_EXTENSION = 'webp'

/**
 * Feature flag. The extension must be installed AND existing images backfilled
 * before variants exist, so this defaults off (unset ⇒ disabled). The owner
 * flips it on after running the install/backfill in `docs/IMAGE_PIPELINE.md`.
 */
export const IMAGE_VARIANTS_ENABLED =
  import.meta.env.VITE_IMAGE_VARIANTS_ENABLED === 'true'

// A Firebase Storage download URL looks like:
//   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<enc-path>?alt=media&token=…
// where <enc-path> is the object path with every "/" encoded as "%2F". Capture
// the "…/o/" prefix (group 1) and the encoded path up to the query (group 2).
const FIREBASE_STORAGE_URL =
  /^(https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/)([^?]+)/

/**
 * Build the resized-variant URL for `width` from a stored original URL, or
 * `null` if `url` isn't a recognizable Firebase Storage object URL (empty, a
 * legacy/other host, the Cypress fake URL, …).
 *
 * The variant URL is **token-less**: it relies on the bucket's public-read
 * Storage rule (`allow read: if true`), so it needs no per-object download token
 * — which matters because each resized object has its own token we can't derive
 * from the original's. (Verified: token-less reads return 200 under the current
 * rules.) Deriving from the stored URL string keeps this bucket-agnostic, so it
 * works across the mixed-bucket catalog.
 */
export function recipeImageVariantUrl(
  url: string | undefined | null,
  width: number
): string | null {
  if (!url) return null
  const match = url.match(FIREBASE_STORAGE_URL)
  if (!match) return null
  const [, base, encodedPath] = match

  let objectPath: string
  try {
    objectPath = decodeURIComponent(encodedPath)
  } catch {
    return null // malformed percent-encoding
  }

  // Split dir / filename / extension so the variant sits beside the original
  // with the extension swapped, matching the extension's naming:
  //   recipeImages/photo.jpg  ->  recipeImages/photo_400x400.webp
  const slash = objectPath.lastIndexOf('/')
  const dir = slash === -1 ? '' : objectPath.slice(0, slash + 1)
  const file = slash === -1 ? objectPath : objectPath.slice(slash + 1)
  const dot = file.lastIndexOf('.')
  const stem = dot === -1 ? file : file.slice(0, dot)
  if (!stem) return null // dotfile with no stem, e.g. ".jpg"

  const variantPath = `${dir}${stem}_${width}x${width}.${VARIANT_EXTENSION}`
  return `${base}${encodeURIComponent(variantPath)}?alt=media`
}

/**
 * A `srcset` string over all width variants for a stored original URL, or
 * `undefined` when variants are disabled or the URL yields none — so it drops
 * straight onto `<img srcSet={...}>` (undefined omits the attribute).
 */
export function recipeImageSrcSet(
  url: string | undefined | null
): string | undefined {
  if (!IMAGE_VARIANTS_ENABLED) return undefined
  const set = RECIPE_IMAGE_VARIANT_WIDTHS.map(w => {
    const variant = recipeImageVariantUrl(url, w)
    return variant ? `${variant} ${w}w` : null
  }).filter((v): v is string => v !== null)
  return set.length ? set.join(', ') : undefined
}
