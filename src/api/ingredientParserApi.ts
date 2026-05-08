import { ParsedIngredient, IngredientData, IngredientResponse } from '@jclind/ingredient-parser'
import { http } from './http-common'

export interface EnrichmentResult {
  source: 'cache' | 'spoonacular'
  data: IngredientData | null
  error?: { message: string }
}

export async function fetchIngredientEnrichment(
  parsedIngredient: ParsedIngredient
): Promise<EnrichmentResult> {
  const response = await http.post<IngredientResponse>('/api/ingredients/parse', {
    ingredientString: parsedIngredient.originalIngredientString,
  })
  const result = response.data
  if ('error' in result) {
    return { source: 'spoonacular', data: result.ingredientData, error: result.error }
  }
  return { source: 'spoonacular', data: result.ingredientData }
}
