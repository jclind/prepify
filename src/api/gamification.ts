import { http } from 'src/api/http-common'
import AuthAPI from 'src/api/auth'
import { Gamification } from 'types'

class GamificationAPIClass {
  // The server derives everything from the auth token's uid, so this returns
  // the current user's own gamification state. Skipped when nobody is signed in.
  async getGamification(): Promise<Gamification | null> {
    if (!AuthAPI.getUID()) return null
    const result = await http.get('api/getGamification')
    return result.data
  }
  // Acknowledge achievement unlocks so their toast doesn't fire again. No-op
  // when there's nothing to acknowledge.
  async acknowledgeAchievements(ids: string[]): Promise<void> {
    if (!ids.length) return
    await http.post('api/acknowledgeAchievements', { ids })
  }
}

const GamificationAPI = new GamificationAPIClass()

export default GamificationAPI
