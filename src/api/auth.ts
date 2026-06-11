import { auth } from 'src/client/db'
import { http } from 'src/api/http-common'
import { UserStatus } from 'types'

class AuthAPIClass {
  getUID(): string | null {
    return auth?.currentUser?.uid ?? null
  }
  // The current user's own moderation status (for the account-status banner).
  // Returns null when nobody is signed in.
  async getAccountStatus(): Promise<{
    status: UserStatus
    statusReason: string | null
  } | null> {
    if (!this.getUID()) return null
    const result = await http.get('api/getMyStatus')
    return result.data
  }
  // The server resolves the username from the auth token, so this always
  // returns the current user's own username. Skip the request when nobody is
  // signed in (it would just 401).
  async getUsername(): Promise<string | null> {
    if (!this.getUID()) return null
    const result = await http.get('api/getUsername')
    return result.data
  }
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const result = await http.get(
      `api/checkUsernameAvailability?username=${encodeURIComponent(username)}`
    )
    return result.data
  }
  async setUsername(username: string) {
    await http.post(`api/setUsername?username=${encodeURIComponent(username)}`)
  }
}

const AuthAPI = new AuthAPIClass()

export default AuthAPI
