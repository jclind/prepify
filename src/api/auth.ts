import { auth } from 'src/client/db'
import { http } from 'src/api/http-common'
import { UserStatus } from 'types'

type UserProfile = {
  bio: string
  location: string
  // Present on reads (getProfile); optional so callers writing only bio/location
  // via updateProfile don't have to supply them.
  isPublic?: boolean
  hideLocation?: boolean
}

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
  // The server resolves the profile from the auth token, so this returns the
  // current user's own bio/location. Skip the request when nobody is signed in.
  async getProfile(): Promise<UserProfile | null> {
    if (!this.getUID()) return null
    const result = await http.get('api/getProfile')
    return result.data
  }
  async updateProfile(profile: UserProfile) {
    await http.post('api/updateProfile', profile)
  }
  // Applies (or clears, with '') the Firebase Auth photoURL server-side, AFTER
  // image moderation — the client no longer writes photoURL directly. A rejected
  // image throws (422 CONTENT_BLOCKED), surfaced like the other moderation errors.
  async updatePhoto(photoURL: string) {
    await http.post('api/updatePhoto', { photoURL })
  }
  // Saves the privacy toggles that gate the public /u/:username view. Both flags
  // are always sent so the server stores the current state of each switch.
  async updatePrivacy(isPublic: boolean, hideLocation: boolean) {
    await http.post('api/updatePrivacy', { isPublic, hideLocation })
  }
  // Permanently deletes the user's data + Firebase account (server cascade).
  // Callers should reauthenticate first (see AuthContext.deleteAccount).
  async deleteAccount() {
    await http.post('api/deleteAccount')
  }
  // Fetches the user's full data export as a blob and triggers a browser
  // download. The Bearer token is attached by the http interceptor.
  async exportMyData() {
    const result = await http.get('api/exportMyData', { responseType: 'blob' })
    const url = window.URL.createObjectURL(result.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'prepify-data.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }
}

const AuthAPI = new AuthAPIClass()

export default AuthAPI
