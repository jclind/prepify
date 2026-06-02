import { auth } from 'src/client/db'
import { http } from 'src/api/http-common'

class AuthAPIClass {
  getUID(): string | null {
    return auth?.currentUser?.uid ?? null
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
