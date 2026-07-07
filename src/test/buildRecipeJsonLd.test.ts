import { describe, it, expect } from 'vitest'
import { RecipeType } from 'types'
import {
  buildRecipeJsonLd,
  serializeRecipeJsonLd,
} from 'src/pages/SingleRecipe/buildRecipeJsonLd'

// A complete, valid recipe. Individual tests override just the field under test.
const baseRecipe: RecipeType = {
  _id: 'recipe-1',
  userId: 'author-uid',
  title: 'Chicken Tacos',
  prepTime: 15,
  cookTime: 15,
  servings: 4,
  fridgeLife: 3,
  freezerLife: 14,
  description: 'Tasty tacos',
  ingredients: [],
  instructions: [],
  recipeImage: 'https://example.com/tacos.jpg',
  nutritionData: null,
  totalTime: 30,
  authorUsername: 'chef',
  rating: { rateCount: 0, rateValue: 0 },
  createdAt: '2024-01-01',
  editedAt: null,
  servingPrice: 200,
  cuisine: 'Mexican',
  mealTypes: ['dinner'],
  nutritionLabels: null,
  views: 10,
  numTimesSaved: 2,
  numTimesMade: 5,
}

const PAGE_URL = 'https://prepify.app/recipes/recipe-1'

describe('buildRecipeJsonLd', () => {
  it('emits the core schema.org/Recipe fields', () => {
    const ld = buildRecipeJsonLd(baseRecipe, PAGE_URL)
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Recipe')
    expect(ld.name).toBe('Chicken Tacos')
    expect(ld.description).toBe('Tasty tacos')
    expect(ld.mainEntityOfPage).toBe(PAGE_URL)
    expect(ld.prepTime).toBe('PT15M')
    expect(ld.cookTime).toBe('PT15M')
    expect(ld.totalTime).toBe('PT30M')
    expect(ld.recipeYield).toBe('4 servings')
    expect(ld.author).toEqual({ '@type': 'Person', name: 'chef' })
  })

  it('omits fields that are missing or zero (sparse recipe stays valid)', () => {
    const sparse = {
      ...baseRecipe,
      cookTime: null,
      totalTime: 0,
      servings: 0,
      rating: { rateCount: 0, rateValue: 0 },
    }
    const ld = buildRecipeJsonLd(sparse, PAGE_URL)
    expect('cookTime' in ld).toBe(false)
    expect('totalTime' in ld).toBe(false)
    expect('recipeYield' in ld).toBe(false)
    expect('aggregateRating' in ld).toBe(false)
  })

  it('includes aggregateRating only when there is at least one rating', () => {
    const rated = { ...baseRecipe, rating: { rateCount: 12, rateValue: 4.3333 } }
    const ld = buildRecipeJsonLd(rated, PAGE_URL)
    expect(ld.aggregateRating).toEqual({
      '@type': 'AggregateRating',
      ratingValue: 4.33,
      ratingCount: 12,
      bestRating: 5,
      worstRating: 1,
    })
  })
})

describe('serializeRecipeJsonLd', () => {
  it('produces the same object as buildRecipeJsonLd when parsed back', () => {
    const parsed = JSON.parse(serializeRecipeJsonLd(baseRecipe, PAGE_URL))
    expect(parsed).toEqual(buildRecipeJsonLd(baseRecipe, PAGE_URL))
  })

  // The core of the C3 hardening: a user-controlled field carrying a literal
  // </script> must not survive as raw text in the serialized output, or it would
  // close the ld+json <script> element the moment this is rendered to markup
  // (SSR/prerender). It must still round-trip back to the exact original string.
  it('escapes a </script> breakout in the title but keeps it recoverable', () => {
    const malicious = {
      ...baseRecipe,
      title: 'Tacos</script><script>alert(1)</script>',
    }
    const out = serializeRecipeJsonLd(malicious, PAGE_URL)

    // No literal `<` (hence no `</script>`) survives in the emitted string.
    expect(out).not.toContain('<')
    expect(out).not.toContain('</script>')
    // The escape is present instead...
    expect(out).toContain('\\u003c')
    // ...and JSON-LD consumers still recover the original title verbatim.
    expect(JSON.parse(out).name).toBe(
      'Tacos</script><script>alert(1)</script>'
    )
  })

  it('escapes < wherever it appears (description + instruction steps too)', () => {
    const malicious = {
      ...baseRecipe,
      description: 'Best <b>tacos</b> ever',
      instructions: [
        { content: 'Mix </script> then bake', index: 0, id: 'i1' },
      ],
    }
    const out = serializeRecipeJsonLd(malicious, PAGE_URL)
    expect(out).not.toContain('<')
    const parsed = JSON.parse(out)
    expect(parsed.description).toBe('Best <b>tacos</b> ever')
    expect(parsed.recipeInstructions[0].text).toBe('Mix </script> then bake')
  })
})
