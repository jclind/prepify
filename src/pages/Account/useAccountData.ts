import { useQuery } from '@tanstack/react-query'
import AuthAPI from 'src/api/auth'
import RecipeAPI from 'src/api/recipes'
import GamificationAPI from 'src/api/gamification'
import { useAuth } from 'src/context/AuthContext'
import { AccountTabCounts, Gamification } from 'types'

// Format Firebase's `creationTime` ("Tue, 22 Mar 2023 …") as "March 2023".
const formatMemberSince = (creationTime?: string | null): string | null => {
  if (!creationTime) return null
  const d = new Date(creationTime)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export type AccountData = {
  // The real @username handle — the Share link and public profile route resolve
  // by handle, not display name.
  handle: string
  displayName: string
  photoURL: string | null | undefined
  // Header meta line parts (location · "Since <month year>"), already filtered.
  metaParts: string[]
  bio: string
  counts: AccountTabCounts | null | undefined
  gamification: Gamification | null | undefined
}

// useAccountData — the account header's data layer: the four reads behind the
// profile header (handle, profile, per-tab counts, gamification) plus the
// derived display strings. Split out of Account so the page stays presentational
// and useAchievementsToast can share the same gamification query off the
// react-query cache.
export function useAccountData(): AccountData {
  const uid = AuthAPI.getUID()
  const authRes = useAuth()
  const user = authRes?.user

  // Always fetch the real username handle (even when a Firebase displayName
  // exists): the Share link and public profile route resolve by handle, not by
  // display name, so we need it regardless of what we show in the header.
  const { data: username } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })

  const { data: profile } = useQuery({
    queryKey: ['profile', uid],
    queryFn: () => AuthAPI.getProfile(),
    enabled: !!uid,
  })

  const { data: counts } = useQuery({
    queryKey: ['account-counts', uid],
    queryFn: () => RecipeAPI.getAccountCounts(),
    enabled: !!uid,
  })

  const { data: gamification } = useQuery({
    queryKey: ['gamification', uid],
    queryFn: () => GamificationAPI.getGamification(),
    enabled: !!uid,
  })

  const handle = username ?? '' // the real @username, used for the share/public link
  const displayName = user?.displayName ?? handle
  const memberSince = formatMemberSince(user?.metadata?.creationTime)
  const place = profile?.location ?? ''
  const bio = profile?.bio ?? ''
  // Name and username collapse to the same string today (displayName falls back
  // to the username), so a separate `@handle` would just duplicate the title.
  // Revisit when public profiles (Phase 5) give the handle independent meaning.
  const metaParts = [
    place,
    memberSince ? `Since ${memberSince}` : null,
  ].filter(Boolean) as string[]

  return {
    handle,
    displayName,
    photoURL: user?.photoURL,
    metaParts,
    bio,
    counts,
    gamification,
  }
}
