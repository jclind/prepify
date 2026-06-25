import { IngredientData, ParsedIngredient } from 'types'
import { http } from 'src/api/http-common'

// The shape POST /api/ingredients/parse returns. The server enriches via
// @jclind/ingredient-parser v2 (proxy-backed, key-free) and projects the v2
// result onto Prepify's stable IngredientData shape, soft-failing to
// `ingredientData: null` on a lookup miss. `error` is only present when the
// server surfaces an enrichment problem.
interface ParseEnrichResponse {
  ingredientData: IngredientData | null
  error?: { message: string }
}

export interface EnrichmentResult {
  source: 'cache' | 'spoonacular'
  data: IngredientData | null
  error?: { message: string }
}

export async function fetchIngredientEnrichment(
  parsedIngredient: ParsedIngredient
): Promise<EnrichmentResult> {
  const response = await http.post<ParseEnrichResponse>('/api/ingredients/parse', {
    ingredientString: parsedIngredient.originalIngredientString,
  })
  const result = response.data
  if (result.error) {
    return { source: 'spoonacular', data: result.ingredientData, error: result.error }
  }
  return { source: 'spoonacular', data: result.ingredientData }
}
