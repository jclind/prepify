import { IngredientsType, InstructionsType, RecipeType } from 'types'

// Build a schema.org/Recipe JSON-LD object for a recipe so search engines can
// render rich results (rating stars, cook time, ingredients). Every field is
// emitted only when present, so a sparse recipe still produces valid markup.

// Minutes → ISO-8601 duration (e.g. 40 → "PT40M"). Returns undefined for
// missing/zero so the caller can omit the field entirely.
const isoDuration = (mins: number | null | undefined): string | undefined =>
  mins && mins > 0 ? `PT${Math.round(mins)}M` : undefined

const ingredientToString = (ing: IngredientsType): string | null => {
  if ('parsedIngredient' in ing) {
    const { quantity, unit, ingredient, comment } = ing.parsedIngredient
    return [quantity, unit, ingredient].filter(Boolean).join(' ').trim() +
      (comment ? `, ${comment}` : '')
  }
  return null // group labels aren't ingredients
}

export const buildRecipeJsonLd = (
  recipe: RecipeType,
  pageUrl: string
): Record<string, unknown> => {
  const recipeIngredient = recipe.ingredients
    .map(ingredientToString)
    .filter((s): s is string => !!s && s.length > 0)

  const recipeInstructions = recipe.instructions
    .filter((i: InstructionsType): i is { content: string; index: number; id: string } =>
      'content' in i && !!i.content
    )
    .map(step => ({ '@type': 'HowToStep', text: step.content }))

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.title,
    description: recipe.description,
    mainEntityOfPage: pageUrl,
  }

  if (recipe.recipeImage) jsonLd.image = [recipe.recipeImage]
  if (recipe.authorUsername) {
    jsonLd.author = { '@type': 'Person', name: recipe.authorUsername }
  }
  if (recipe.createdAt) jsonLd.datePublished = recipe.createdAt

  const prep = isoDuration(recipe.prepTime)
  const cook = isoDuration(recipe.cookTime)
  const total = isoDuration(recipe.totalTime)
  if (prep) jsonLd.prepTime = prep
  if (cook) jsonLd.cookTime = cook
  if (total) jsonLd.totalTime = total

  if (recipe.servings > 0) {
    jsonLd.recipeYield = `${recipe.servings} ${recipe.servings === 1 ? 'serving' : 'servings'}`
  }
  if (recipeIngredient.length) jsonLd.recipeIngredient = recipeIngredient
  if (recipeInstructions.length) jsonLd.recipeInstructions = recipeInstructions

  if (recipe.rating && recipe.rating.rateCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(recipe.rating.rateValue.toFixed(2)),
      ratingCount: recipe.rating.rateCount,
      bestRating: 5,
      worstRating: 1,
    }
  }

  // Per-serving calories (Edamam totals are for the whole recipe yield).
  const nd = recipe.nutritionData
  if (nd && nd.calories > 0 && nd.yield > 0) {
    jsonLd.nutrition = {
      '@type': 'NutritionInformation',
      calories: `${Math.round(nd.calories / nd.yield)} calories`,
    }
  }

  return jsonLd
}

// Serialize the JSON-LD object for embedding in a `<script type="application/ld+json">`
// tag. `JSON.stringify` alone leaves a literal `</script>` from a user-controlled field
// (title/description/instructions) intact, which under SSR/prerender would close the
// script element early and render the rest of that field as HTML. Replacing every `<`
// with its backslash-u-003c unicode escape — still a valid JSON string, decoded back to
// `<` by any JSON-LD parser — neutralizes that. Harmless under today's CSR (React inserts the child
// as a text node, so `</script>` never re-parses), but escape it now rather than leave a
// latent hole for the prerender change to trip on.
export const serializeRecipeJsonLd = (
  recipe: RecipeType,
  pageUrl: string
): string =>
  JSON.stringify(buildRecipeJsonLd(recipe, pageUrl)).replace(/</g, '\\u003c')
