import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'

// The signed-in user's star rating for one recipe: seeded from the
// ['check-made'] query, updated optimistically on star taps, reverted (with a
// toast) when the server rejects. One hook so the invitation composer and the
// own-review card share identical behavior.
export const useOwnRating = (recipeId: string) => {
  const queryClient = useQueryClient()
  const uid = AuthAPI.getUID()
  const [rating, setRating] = useState(0)
  // Monotonic id of the most recent rating change. Keyboard nav (arrow-key
  // hold / OS key-repeat) can fire several changeRating calls before any
  // resolves, so responses may land out of order. We only let a request touch
  // the UI if it's still the latest — otherwise a slow earlier request's
  // failure would revert to a stale value the user already moved past.
  const latestReqRef = useRef(0)

  const { data: ownReview } = useQuery({
    queryKey: ['check-made', recipeId],
    queryFn: () => RecipeAPI.checkIfReviewed(recipeId),
    enabled: !!uid,
  })

  useEffect(() => {
    const r = ownReview?.rating
    setRating(typeof r === 'number' ? r : 0)
  }, [ownReview])

  // After a rating change, refresh the recipe aggregate (average + breakdown)
  // and the user's own doc so both reflect the server recompute rather than
  // the stale page-load value.
  const refreshRatingViews = () => {
    queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] })
    queryClient.invalidateQueries({ queryKey: ['check-made', recipeId] })
  }

  const changeRating = async (val: number) => {
    const prev = rating
    const reqId = ++latestReqRef.current
    setRating(val)
    try {
      await RecipeAPI.addRating(recipeId, val)
    } catch (err) {
      // Superseded by a newer change — leave that one's value in place.
      if (latestReqRef.current !== reqId) return
      setRating(prev)
      toast.error('Could not save your rating. Please try again.')
      return
    }
    // Only the latest change should refetch; a stale success would pull the
    // aggregate mid-flight and fight the newer optimistic value.
    if (latestReqRef.current === reqId) refreshRatingViews()
  }

  const removeRating = async () => {
    const prev = rating
    const reqId = ++latestReqRef.current
    setRating(0)
    try {
      await RecipeAPI.removeRating(recipeId)
    } catch (err) {
      if (latestReqRef.current !== reqId) return
      setRating(prev)
      toast.error('Could not remove your rating. Please try again.')
      return
    }
    if (latestReqRef.current === reqId) refreshRatingViews()
  }

  return { rating, changeRating, removeRating, ownReview }
}
