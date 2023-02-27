import { auth } from '../client/db'

class AuthAPIClass {
  getUID(): string | null {
    return auth?.currentUser?.uid ?? null
  }
}

const AuthAPI = new AuthAPIClass()

export default AuthAPI
