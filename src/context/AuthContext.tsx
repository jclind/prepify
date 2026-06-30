import React, { FC, ReactNode, useState, useEffect, useContext } from 'react'
import {
  signOut,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  UserCredential,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth'

import { useNavigate } from 'react-router-dom'
import AuthAPI from 'src/api/auth'
import { TailSpin } from 'react-loader-spinner'
import { spinnerColor } from 'src/util/loadingStyles'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { ErrorWithData } from 'src/util/ErrorWithData'
import { setSentryUser } from 'src/util/sentry'
import { authErrorMessage } from 'src/util/authErrors'

export function useAuth() {
  return useContext(AuthContext)
}

type AuthContextValueType = {
  user: UserCredential['user'] | null
  isAdmin: boolean
  logout: () => void
  signInWithGoogle: (setError: (val: string) => void) => void
  signInDefault: (
    email: string,
    password: string,
    remember: boolean,
    setLoading: (val: boolean) => void,
    setError: (val: string) => void
  ) => void
  signUp: (
    email: string,
    password: string,
    setLoading: (val: boolean) => void,
    setError: (val: string) => void
  ) => void
  forgotPassword: (
    email: string,
    setLoading: (val: boolean) => void,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => void
  authLoading: boolean
  updateProfileData: (data: {
    displayName?: string
    username?: string
    imgFile?: File | null
    email?: string
    password?: string
  }) => Promise<void>
  changePassword: (oldPass: string, newPass: string) => Promise<void>
  // Reauthenticates, then deletes the user's data + Firebase account (server
  // cascade) and signs out. `password` is required for password-based accounts;
  // Google-only accounts reauthenticate via a popup and ignore it.
  deleteAccount: (password?: string) => Promise<void>
}

type AuthProviderProps = {
  children: ReactNode
}

const AuthContext = React.createContext<AuthContextValueType | null>(null)

const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  // getAuth() is resolved here rather than at module scope so that merely
  // importing this module (e.g. for the useAuth hook, as ReportControl does)
  // never triggers Firebase init — which would throw in environments/tests
  // where no Firebase app has been created. getAuth() is idempotent.
  const auth = getAuth()
  const [user, setUser] = useState<UserCredential['user'] | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  const logout = () => {
    signOut(auth)
      .then(() => {
        navigate('/')
      })
      .catch(err => {
        console.error('sign out NOT success,', err)
      })
  }
  const signInWithGoogle = (setError: (val: string) => void) => {
    const provider = new GoogleAuthProvider()

    signInWithPopup(auth, provider)
      .then(result => {
        navigate('/')
      })
      .catch(err => {
        // authErrorMessage returns '' for benign cases (e.g. the user closing
        // the popup), so only surface a banner when there's something to say.
        const message = authErrorMessage(err.code)
        if (message) setError(message)
      })
  }
  const signInDefault = (
    email: string,
    password: string,
    remember: boolean,
    setLoading: (val: boolean) => void,
    setError: (val: string) => void
  ) => {
    if (!email) {
      return setError('Please enter your email.')
    } else if (!password) {
      return setError('Please enter your password.')
    }
    setLoading(true)
    // "Remember me" → keep the session across browser restarts (local), else
    // drop it when the tab/window closes (session). Local matches Firebase's
    // default, so leaving the box checked preserves prior behavior.
    setPersistence(
      auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    )
      .then(() => signInWithEmailAndPassword(auth, email, password))
      .then(userCredential => {
        setUser(userCredential.user)
        navigate('/')
      })
      .catch(err => {
        setLoading(false)
        setError(authErrorMessage(err.code))
      })
  }
  const signUp = (
    email: string,
    password: string,
    setLoading: (val: boolean) => void,
    setError: (val: string) => void
  ) => {
    if (!email) {
      return setError('Please enter your email.')
    } else if (!password) {
      return setError('Please enter your password.')
    }
    setLoading(true)
    createUserWithEmailAndPassword(auth, email, password)
      .then(cred => {
        setUser(cred.user)
        setLoading(false)
        // Username + optional profile details (display name, bio, location) are
        // collected on the onboarding step. The post-auth redirect also funnels
        // username-less Google sign-ins here, so both paths share one page.
        navigate('/create-username')
      })
      .catch(err => {
        setLoading(false)
        setError(authErrorMessage(err.code))
      })
  }
  const forgotPassword = (
    email: string,
    setLoading: (val: boolean) => void,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => {
    if (!email) {
      return setError('Please enter your email.')
    }
    setLoading(true)
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setLoading(false)
        setSuccess('Email sent! Check your inbox for instructions.')
      })
      .catch(err => {
        setLoading(false)
        // Don't reveal whether an email is registered: a missing account still
        // shows the same "email sent" confirmation. Only genuinely actionable
        // problems (bad email format, network, rate-limit) surface an error.
        if (err.code === 'auth/user-not-found') {
          setSuccess('Email sent! Check your inbox for instructions.')
        } else {
          setError(authErrorMessage(err.code))
        }
      })
  }

  // Avatar intent is encoded in imgFile: a File uploads + sets a new photo,
  // `null` explicitly clears it, and `undefined` (the key omitted) leaves the
  // existing photo untouched. Likewise an omitted displayName is left as-is. This
  // lets an email-only or name-only save run without clobbering the avatar.
  const updateProfileData = async (data: {
    displayName?: string
    username?: string
    imgFile?: File | null
    email?: string
    password?: string
  }) => {
    if (user) {
      const currUsername = await AuthAPI.getUsername()
      const { displayName, username, imgFile, email, password } = data

      // The new photoURL: the uploaded image's download URL, '' to clear, or
      // undefined to leave it untouched.
      let newPhotoURL: string | undefined
      if (imgFile) {
        const storage = getStorage()
        // Key the storage path by uid (not the original filename) so two users
        // who upload a file of the same name can't overwrite each other's photo.
        // No extension, so a re-upload always replaces the same object rather
        // than orphaning the old one (Firebase serves the stored content-type).
        const profilePhotosRef = ref(storage, `profilePhotos/${user.uid}`)
        await uploadBytes(profilePhotosRef, imgFile)
        newPhotoURL = await getDownloadURL(profilePhotosRef)
      } else if (imgFile === null) {
        newPhotoURL = ''
      }

      // Apply the photo through the SERVER so it gets moderated before it's set
      // on the Firebase Auth profile (an unmoderated photoURL can't be written
      // client-side anymore). A rejected image throws here — before any other
      // profile field is written — and the form surfaces the moderation error.
      // reload() then refreshes the local user so the new (or cleared) photoURL
      // is reflected immediately, as the old client-side updateProfile did.
      if (newPhotoURL !== undefined) {
        await AuthAPI.updatePhoto(newPhotoURL)
        await user.reload()
      }

      if (username && username !== currUsername) {
        await AuthAPI.setUsername(username)
      }
      if (email && user.email && email !== user.email) {
        if (!password) {
          throw new ErrorWithData(
            'password-required',
            'Password Is Required For Reauthentication'
          )
        }
        const credential = EmailAuthProvider.credential(user.email, password)
        await reauthenticateWithCredential(user, credential)
        // Sends a verification link to the NEW address; the email only actually
        // changes once the user clicks it. This is required when Firebase's
        // email-enumeration protection is on (plain updateEmail throws there),
        // and it matches the "check your inbox to verify it" copy the UI shows.
        await verifyBeforeUpdateEmail(user, email)
      }

      // Apply the displayName through the SERVER so it gets moderated before it's
      // set on the Firebase Auth profile (like the photo above — the client no
      // longer writes displayName directly). A rejected name throws here and the
      // form surfaces the moderation error; reload() refreshes the local user.
      if (displayName !== undefined) {
        await AuthAPI.updateDisplayName(displayName)
        await user.reload()
      }
    }
  }
  const changePassword = async (oldPass: string, newPass: string) => {
    if (user && user.email) {
      const credential = EmailAuthProvider.credential(user.email, oldPass)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPass)
    }
  }
  const deleteAccount = async (password?: string) => {
    if (!user) return
    // Firebase requires a recent login before a destructive op. Reauthenticate
    // with the method the account actually uses: password accounts re-enter
    // their password; Google accounts re-consent via a popup.
    const providers = user.providerData.map(p => p.providerId)
    if (providers.includes('password')) {
      if (!password) {
        throw new ErrorWithData(
          'password-required',
          'Password Is Required To Delete Your Account'
        )
      }
      if (!user.email) {
        throw new ErrorWithData(
          'no-email',
          'This account has no email to reauthenticate with.'
        )
      }
      const credential = EmailAuthProvider.credential(user.email, password)
      await reauthenticateWithCredential(user, credential)
    } else {
      await reauthenticateWithPopup(user, new GoogleAuthProvider())
    }

    // Server cascades the Mongo data and deletes the Firebase auth account. The
    // request goes out while the (just-refreshed) token is still valid.
    await AuthAPI.deleteAccount()

    // The auth account no longer exists; clear local state and leave.
    await signOut(auth)
    navigate('/')
  }

  // Check for auth status on page load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async userInstance => {
      // Attribute Sentry error reports to the signed-in account (cleared on
      // logout). No-ops when Sentry is disabled.
      setSentryUser(userInstance ? { uid: userInstance.uid } : null)
      if (userInstance) {
        setUser(userInstance)
        // Read the admin custom claim off the verified ID token. Mirrors the
        // server's req.isAdmin so the client can gate admin-only UI/routes.
        try {
          const tokenResult = await userInstance.getIdTokenResult()
          setIsAdmin(tokenResult.claims.admin === true)
        } catch {
          setIsAdmin(false)
        }
      } else {
        setUser(null)
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Check if user has username after auth is loaded and user exists. A failed
  // lookup leaves a username-less user (e.g. a fresh Google sign-in) stranded
  // without the redirect, so retry transient failures with backoff before
  // giving up rather than surfacing a non-actionable error to the user.
  useEffect(() => {
    if (loading || !user || !user.uid) return

    let cancelled = false
    const MAX_ATTEMPTS = 3
    const BASE_DELAY_MS = 500
    const delay = (ms: number) =>
      new Promise(resolve => setTimeout(resolve, ms))

    const verifyUsername = async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const username = await AuthAPI.getUsername()
          if (cancelled) return
          if (!username) navigate('/create-username')
          return
        } catch (err) {
          if (cancelled) return
          if (attempt === MAX_ATTEMPTS) {
            console.error('Failed to verify username on auth load:', err)
            return
          }
          // Exponential backoff: 500ms, then 1000ms.
          await delay(BASE_DELAY_MS * 2 ** (attempt - 1))
          if (cancelled) return
        }
      }
    }

    verifyUsername()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const value: AuthContextValueType = {
    user,
    isAdmin,
    logout,
    signInWithGoogle,
    signInDefault,
    signUp,
    forgotPassword,
    authLoading: loading,
    updateProfileData,
    changePassword,
    deleteAccount,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className='auth-loading-container'>
          <h2>Auth Loading...</h2>
          <TailSpin height='30' width='30' color={spinnerColor} ariaLabel='loading' />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export default AuthProvider
