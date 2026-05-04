import axios from 'axios'
import { getAuth } from 'firebase/auth'
import { ParsedIngredient, IngredientData } from '@jclind/ingredient-parser'

const INGREDIENT_PARSER_URL =
  process.env.REACT_APP_INGREDIENT_PARSER_URL || 'http://localhost:4001'

export interface EnrichmentResult {
  source: 'cache' | 'spoonacular'
  data: IngredientData | null
  error?: { message: string }
}

export async function fetchIngredientEnrichment(
  parsedIngredient: ParsedIngredient
): Promise<EnrichmentResult> {
  const auth = getAuth()
  const token = await auth.currentUser?.getIdToken()

  const response = await axios.post<EnrichmentResult>(
    `${INGREDIENT_PARSER_URL}/parse`,
    { ingredientString: parsedIngredient.originalIngredientString },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  )

  return response.data
}
