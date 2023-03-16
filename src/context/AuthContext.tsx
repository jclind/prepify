import React, { useState, useEffect, useContext } from 'react'
import {
  signOut,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
} from 'firebase/auth'

import { useNavigate } from 'react-router-dom'
import AuthAPI from 'src/api/auth'
import { TailSpin } from 'react-loader-spinner'

export function useAuth() {
  return useContext(AuthContext)
}

type AuthContextValueType = {
  user: UserCredential['user'] | null
  logout: () => void
  signInWithGoogle: (setError: (val: string) => void) => void
  signInDefault: (
    email: string,
    password: string,
    setError: (val: string) => void
  ) => void
  signUp: (
    email: string,
    password: string,
    username: string,
    setLoading: (val: boolean) => void,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => void
  forgotPassword: (
    email: string,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => void
  authLoading: boolean
}

type AuthProviderProps = {
  children: React.ReactElement
}

const AuthContext = React.createContext<AuthContextValueType | null>(null)
const auth = getAuth()

const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserCredential['user'] | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  const logout = () => {
    signOut(auth)
      .then(() => {
        navigate('/')
      })
      .catch(err => {
        console.log('sign out NOT success,', err)
      })
  }
  const signInWithGoogle = (setError: (val: string) => void) => {
    const provider = new GoogleAuthProvider()

    signInWithPopup(auth, provider)
      .then(result => {
        navigate('/')
      })
      .catch(err => {
        setError(err.code)
      })
  }
  const signInDefault = (
    email: string,
    password: string,
    setError: (val: string) => void
  ) => {
    if (!email) {
      return setError('Must enter email')
    } else if (!password) {
      return setError('Must enter password')
    }
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        setUser(userCredential.user)
        navigate('/')
      })
      .catch(err => {
        const errCode = err.code

        switch (errCode) {
          case 'auth/user-not-found':
            return setError(
              'User not found in database, try creating an account.'
            )
          default:
            return setError('Error, try refreshing your page.')
        }
      })
  }
  const signUp = (
    email: string,
    password: string,
    username: string,
    setLoading: (val: boolean) => void,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => {
    setLoading(true)
    if (!username) {
      return setError('Must enter username')
    } else if (!email) {
      return setError('Must enter email')
    } else if (!password) {
      return setError('Must enter password')
    }

    AuthAPI.checkUsernameAvailability(username).then(isAvailable => {
      if (!isAvailable) {
        return setError(`${username} has already been taken`)
      }
      createUserWithEmailAndPassword(auth, email, password)
        .then(cred => {
          const uid = cred.user.uid
          AuthAPI.setUsername(uid, username).then(() => {
            setLoading(false)
            setSuccess('Username successfully created!')
            return navigate('/')
          })
        })
        .catch(err => {
          const errCode = err.code
          setError(errCode)
          setLoading(false)
        })
    })
  }
  const forgotPassword = (
    email: string,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setSuccess('Email sent! Check your inbox for instructions.')
      })
      .catch(err => {
        console.log(err)
        setError(err.code)
      })
  }

  // Check for auth status on page load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(userInstance => {
      if (userInstance) {
        // Gets type of authentication, ie... password, google...
        // const providerId = userInstance.providerData[0].providerId

        // // If the authentication is anything other than password, send getUsername to check if username exists for that user
        // if (providerId !== 'password') {
        //   // // !!FIX MEEEEEE

        // }

        setUser(userInstance)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Check if user has username after auth is loaded and user exists
  useEffect(() => {
    if (!loading && user && user.uid) {
      AuthAPI.getUsername(user.uid).then(username => {
        if (!username) {
          navigate('/create-username')
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user])

  const value: AuthContextValueType = {
    user,
    logout,
    signInWithGoogle,
    signInDefault,
    signUp,
    forgotPassword,
    authLoading: loading,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className='auth-loading-container'>
          <h2>Auth Loading...</h2>
          <TailSpin height='30' width='30' color='black' ariaLabel='loading' />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export default AuthProvider
