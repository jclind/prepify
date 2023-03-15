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
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '../client/db'

import { useNavigate } from 'react-router-dom'
import AuthAPI from 'src/api/auth'

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

  // const getUsername = async (uid: string): Promise<string | null> => {
  //   // // Get reference to username collection document with property of the passed uid

  //   // const usernamesRef = doc(db, 'username', uid)
  //   // const usernamesSnap = await getDoc(usernamesRef)

  //   // if (usernamesSnap.exists()) {
  //   //   const currUsername = usernamesSnap.data().username
  //   //   return currUsername
  //   // } else {
  //   //   navigate('/create-username')
  //   //   return null
  //   // }
  // }

  // const checkUsernameAvailability = async (
  //   username: string,
  //   setLoading?: (val: boolean) => void
  // ): Promise<boolean> => {
  //   if (setLoading) {
  //     setLoading(true)
  //   }

  //   const usernamesRef = collection(db, 'username')
  //   const q = query(usernamesRef, where('username', '==', username))

  //   const usernamesQuerySnapshot = await getDocs(q)
  //   if (usernamesQuerySnapshot.empty) {
  //     return true
  //   }
  //   return false
  // }

  // const setUsername = async (
  //   uid: string,
  //   username: string,
  //   setLoading: (val: boolean) => void,
  //   setSuccess: (val: string) => void,
  //   setError: (val: string) => void
  // ) => {
  //   if (setLoading) setLoading(true)

  //   const isAvailable = await checkUsernameAvailability(username)
  //   if (!isAvailable) {
  //     if (setError) return setError(`${username} has already been taken`)
  //   }

  //   const usernameData = { username }

  //   const usernamesRef = doc(db, 'username', uid)
  //   await setDoc(usernamesRef, usernameData)
  //   // If setSuccess exists, set it's message
  //   return setSuccess ? setSuccess('Username successfully created!') : null
  // }

  // Check for auth status on page load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(userInstance => {
      if (userInstance) {
        // Gets type of authentication, ie... password, google...
        const providerId = userInstance.providerData[0].providerId

        // If the authentication is anything other than password, send getUsername to check if username exists for that user
        if (providerId !== 'password') {
          // !!FIX MEEEEEE
          AuthAPI.getUsername(userInstance.uid)
        }

        setUser(userInstance)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      {loading ? 'Auth Loading' : children}
    </AuthContext.Provider>
  )
}

export default AuthProvider
