import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import AuthAPI from 'src/api/auth'
import GamificationAPI from 'src/api/gamification'
import { Gamification } from 'types'

// useAchievementsToast — celebrate any achievements earned since the user last
// looked, then mark them acknowledged so the toast won't fire again on the next
// load. Several can unlock at once (e.g. a new user's first visit), so collapse
// those into one summary toast rather than stacking a wall of them.
export function useAchievementsToast(
  gamification: Gamification | null | undefined
): void {
  const uid = AuthAPI.getUID()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!gamification || gamification.newlyUnlocked.length === 0) return
    const byId = new Map(gamification.achievements.map(a => [a.id, a]))
    const names = gamification.newlyUnlocked
      .map(id => byId.get(id)?.name)
      .filter((n): n is string => !!n)
    if (names.length === 1) {
      toast.success(`🏅 Achievement unlocked: ${names[0]}!`)
    } else if (names.length > 1) {
      toast.success(`🏅 ${names.length} achievements unlocked!`)
    }
    GamificationAPI.acknowledgeAchievements(gamification.newlyUnlocked)
      .then(() =>
        queryClient.invalidateQueries({ queryKey: ['gamification', uid] })
      )
      .catch(() => {
        // Non-fatal: if the ack fails, the toast simply re-fires next load.
      })
  }, [gamification, uid, queryClient])
}
