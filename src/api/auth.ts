import { auth } from '../client/db'
import { http } from './http-common'

class AuthAPIClass {
  getUID(): string | null {
    return auth?.currentUser?.uid ?? null
  }
  async getUsername(userId?: string): Promise<string | null> {
    let uid: string | null = userId ?? null
    if (!userId) {
      uid = this.getUID()
    }
    const result = await http.get(`getUsername?userId=${uid}`)
    return result.data
  }
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const result = await http.get(
      `checkUsernameAvailability?&username=${username}`
    )
    return result.data
  }
  async setUsername(userId: string, username: string) {
    await http.post(`setUsername?userId=${userId}&username=${username}`)
  }
}

const AuthAPI = new AuthAPIClass()

export default AuthAPI
