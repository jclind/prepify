import { vi } from 'vitest'
import {
  INGREDIENT_ENRICH_TIMEOUT_MS,
  IngredientEnrichTimeoutError,
  withTimeout,
} from 'src/pages/AddRecipe/Ingredients/ingredientEnrichment'

describe('withTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('resolves with the wrapped value when it settles before the timeout', async () => {
    const p = withTimeout(Promise.resolve('flour'), 1000)
    await expect(p).resolves.toBe('flour')
  })

  it('propagates the wrapped rejection when it rejects before the timeout', async () => {
    const p = withTimeout(Promise.reject(new Error('boom')), 1000)
    await expect(p).rejects.toThrow('boom')
  })

  it('rejects with IngredientEnrichTimeoutError when the promise never settles', async () => {
    // A promise that never resolves stands in for a hung enrichment request.
    const never = new Promise<string>(() => {})
    const p = withTimeout(never, 5000)
    const assertion = expect(p).rejects.toBeInstanceOf(IngredientEnrichTimeoutError)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('does not fire the timeout once the promise has resolved (timer cleared)', async () => {
    const p = withTimeout(Promise.resolve('ok'), 1000)
    await expect(p).resolves.toBe('ok')
    // Advancing past the timeout must not turn a resolved promise into a
    // rejection — the timer should already be cleared.
    await vi.advanceTimersByTimeAsync(2000)
    await expect(p).resolves.toBe('ok')
  })

  it('defaults to INGREDIENT_ENRICH_TIMEOUT_MS', async () => {
    const never = new Promise<string>(() => {})
    const p = withTimeout(never)
    const assertion = expect(p).rejects.toBeInstanceOf(IngredientEnrichTimeoutError)
    await vi.advanceTimersByTimeAsync(INGREDIENT_ENRICH_TIMEOUT_MS)
    await assertion
  })
})
