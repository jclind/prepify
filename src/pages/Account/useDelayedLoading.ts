import { useEffect, useState } from 'react'

// Returns true only once `loading` has stayed true for at least `delayMs`.
//
// Account sub-pages (Saved / Ratings / Your Recipes / Drafts) all show a
// skeleton while their query is in flight, then swap to content or an empty
// state. When the API answers near-instantly — a fast local server or a cache
// hit — that skeleton renders for a single frame and snaps away, which reads as
// a jarring flash. Gating the skeleton behind a short delay means a quick query
// resolves before the skeleton ever appears, while a genuinely slow query still
// gets one. Resets to false the moment loading ends.
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
