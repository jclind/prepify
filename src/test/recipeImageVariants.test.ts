import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  recipeImageVariantUrl,
  recipeImageSrcSet,
} from 'src/util/recipeImageVariants'

// A real-shape Firebase Storage download URL (legacy prod bucket, with token).
const ORIGINAL =
  'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2FCinnamon-Raisin-Granola-4.jpg?alt=media&token=9fa71bb6-04ef-4923-9015-73d90abce7e9'

describe('recipeImageVariantUrl', () => {
  it('swaps in the _WxW.webp variant beside the original and drops the token', () => {
    expect(recipeImageVariantUrl(ORIGINAL, 400)).toBe(
      'https://firebasestorage.googleapis.com/v0/b/prepify-9b974.appspot.com/o/recipeImages%2FCinnamon-Raisin-Granola-4_400x400.webp?alt=media'
    )
  })

  it('is bucket-agnostic — derives the bucket from the stored URL', () => {
    const devUrl = ORIGINAL.replace(
      'prepify-9b974.appspot.com',
      'prepify-dev-58579.firebasestorage.app'
    )
    const variant = recipeImageVariantUrl(devUrl, 800)
    expect(variant).toContain('/b/prepify-dev-58579.firebasestorage.app/o/')
    expect(variant).toContain('_800x800.webp')
  })

  it('produces a round-trippable, token-less object path', () => {
    const variant = recipeImageVariantUrl(ORIGINAL, 1600)!
    const encoded = variant.match(/\/o\/([^?]+)/)![1]
    expect(decodeURIComponent(encoded)).toBe(
      'recipeImages/Cinnamon-Raisin-Granola-4_1600x1600.webp'
    )
    expect(variant).not.toContain('token=')
  })

  it('works when the original has no token', () => {
    const noToken =
      'https://firebasestorage.googleapis.com/v0/b/b1/o/recipeImages%2Fp.jpg?alt=media'
    expect(recipeImageVariantUrl(noToken, 400)).toBe(
      'https://firebasestorage.googleapis.com/v0/b/b1/o/recipeImages%2Fp_400x400.webp?alt=media'
    )
  })

  it('handles a filename with no extension', () => {
    const url =
      'https://firebasestorage.googleapis.com/v0/b/b1/o/recipeImages%2Fphoto?alt=media'
    expect(recipeImageVariantUrl(url, 400)).toBe(
      'https://firebasestorage.googleapis.com/v0/b/b1/o/recipeImages%2Fphoto_400x400.webp?alt=media'
    )
  })

  it('returns null for empty / non-Firebase / dotfile URLs', () => {
    expect(recipeImageVariantUrl('', 400)).toBeNull()
    expect(recipeImageVariantUrl(null, 400)).toBeNull()
    expect(recipeImageVariantUrl(undefined, 400)).toBeNull()
    // Cypress E2E bridge returns this fake URL — must not be transformed.
    expect(
      recipeImageVariantUrl('https://cypress.test/fake-recipe-image.jpg', 400)
    ).toBeNull()
    expect(recipeImageVariantUrl('https://example.com/img.jpg', 400)).toBeNull()
    // Dotfile with no stem (e.g. an object literally named ".jpg").
    expect(
      recipeImageVariantUrl(
        'https://firebasestorage.googleapis.com/v0/b/b1/o/recipeImages%2F.jpg?alt=media',
        400
      )
    ).toBeNull()
  })
})

describe('recipeImageSrcSet (feature-flag gating)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns undefined when the flag is off (the default)', () => {
    // Imported at top of file with VITE_IMAGE_VARIANTS_ENABLED unset ⇒ disabled.
    expect(recipeImageSrcSet(ORIGINAL)).toBeUndefined()
  })

  it('composes a full srcset over every width when the flag is on', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_IMAGE_VARIANTS_ENABLED', 'true')
    const mod = await import('src/util/recipeImageVariants')

    const srcset = mod.recipeImageSrcSet(ORIGINAL)
    expect(srcset).toBeDefined()
    for (const w of mod.RECIPE_IMAGE_VARIANT_WIDTHS) {
      expect(srcset).toContain(`_${w}x${w}.webp?alt=media ${w}w`)
    }
    expect(srcset!.split(',').length).toBe(
      mod.RECIPE_IMAGE_VARIANT_WIDTHS.length
    )
  })

  it('returns undefined (even with the flag on) when the URL yields no variants', async () => {
    vi.resetModules()
    vi.stubEnv('VITE_IMAGE_VARIANTS_ENABLED', 'true')
    const mod = await import('src/util/recipeImageVariants')

    expect(mod.recipeImageSrcSet('https://cypress.test/fake.jpg')).toBeUndefined()
    expect(mod.recipeImageSrcSet('')).toBeUndefined()
    expect(mod.recipeImageSrcSet(null)).toBeUndefined()
  })
})
