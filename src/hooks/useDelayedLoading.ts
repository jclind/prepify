import { useEffect, useState } from 'react'

// Returns true only once `loading` has stayed true for at least `delayMs`.
//
// Prepify's loading convention (docs/design/loading-states.md) shows a skeleton
// while data is in flight, then swaps to content or an empty state. When the API
// answers near-instantly — a fast local server or a cache hit — that skeleton
// renders for a single frame and snaps away, which reads as a jarring flash.
// Gating the skeleton behind a short delay means a quick query resolves before
// the skeleton ever appears, while a genuinely slow query still gets one. Resets
// to false the moment loading ends.
//
// This is the default guard for skeleton placeholders (account sub-pages, the
// recipe grid, Home cards, SingleRecipe, …). Button-busy spinners are left
// instant on purpose — a busy button should acknowledge the click immediately.
export const useDelayedLoading = (
  loading: boolean,
  delayMs = 220
): boolean => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShow(false)
      return
    }
    const id = setTimeout(() => setShow(true), delayMs)
    return () => clearTimeout(id)
  }, [loading, delayMs])

  return show
}
