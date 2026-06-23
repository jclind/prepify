import { useQuery } from '@tanstack/react-query'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import { NavMenuData } from './types'

/**
 * Centralizes the auth/profile data the mobile-nav variants need, so each
 * variant renders from one source instead of re-running the username query.
 */
export const useNavMenu = (): NavMenuData => {
  const authRes = useAuth()
  const uid = AuthAPI.getUID()

  const { data } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid && !!authRes?.user,
  })

  const username = data ?? ''
  const email = authRes?.user?.email ?? ''

  return {
    isLoggedIn: !!authRes?.user,
    authLoading: !!authRes?.authLoading,
    username,
    email,
    photoURL: authRes?.user?.photoURL ?? null,
    logout: () => authRes?.logout(),
  }
}
