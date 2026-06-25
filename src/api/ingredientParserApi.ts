import { IngredientData, ParsedIngredient } from 'types'
import { http } from 'src/api/http-common'

// The shape POST /api/ingredients/parse returns. The server enriches via
// @jclind/ingredient-parser v2 (proxy-backed, key-free) and projects the v2
// result onto Prepify's stable IngredientData shape, soft-failing to
// `ingredientData: null` on a lookup miss. A transport/proxy failure surfaces as
// a 5xx (axios rejection) — not a field on this body — so there is no `error` key.
interface ParseEnrichResponse {
  ingredientData: IngredientData | null
}

export interface EnrichmentResult {
  data: IngredientData | null
}

export async function fetchIngredientEnrichment(
  parsedIngredient: ParsedIngredient
): Promise<EnrichmentResult> {
  const response = await http.post<ParseEnrichResponse>('/api/ingredients/parse', {
    ingredientString: parsedIngredient.originalIngredientString,
  })
  return { data: response.data.ingredientData }
}
