import axios from 'axios'
import { http } from 'src/api/http-common'
import { PublicProfile } from 'types'

class PublicProfileAPIClass {
  // Public endpoint — no auth required. A missing username is an expected
  // outcome (the user doesn't exist), so 404 resolves to null rather than
  // throwing; the page renders that as a not-found state. Other errors propagate.
  async getPublicProfile(username: string): Promise<PublicProfile | null> {
    try {
      const result = await http.get(
        `api/getPublicProfile?username=${encodeURIComponent(username)}`
      )
      return result.data
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null
      }
      throw err
    }
  }
}

const PublicProfileAPI = new PublicProfileAPIClass()

export default PublicProfileAPI
