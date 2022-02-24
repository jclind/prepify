import React, { useState, useEffect, useContext } from 'react'
import {
  signOut,
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
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

const AuthContext = React.createContext()
const auth = getAuth()

export function useAuth() {
  return useContext(AuthContext)
}

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  const logout = () => {
    signOut(auth)
      .then(() => {
        console.log('sign out success')
        navigate('/')
      })
      .catch(err => {
        console.log('sign out NOT success,', err)
      })
  }

  const signInWithGoogle = setError => {
    const provider = new GoogleAuthProvider()

    signInWithPopup(auth, provider)
      .then(result => {
        navigate('/')
      })
      .catch(err => {
        setError(err.code)
      })
  }
  const signInDefault = (email, password, setError) => {
    if (!email) {
      return setError('Must enter email')
    } else if (!password) {
      return setError('Must enter password')
    }
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredential => {
        setUser(userCredential.user)
        console.log('Login Success')
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
    email,
    password,
    username,
    setLoading,
    setSuccess,
    setError
  ) => {
    setLoading(true)
    if (!username) {
      return setError('Must enter username')
    } else if (!email) {
      return setError('Must enter email')
    } else if (!password) {
      return setError('Must enter password')
    }

    checkUsernameAvailability(username).then(isAvailable => {
      if (!isAvailable) {
        return setError(`${username} has already been taken`)
      }
      createUserWithEmailAndPassword(auth, email, password)
        .then(cred => {
          const uid = cred.user.uid
          setUsername(uid, username, setLoading, setSuccess, setError).then(
            () => {
              setLoading(false)
              return navigate('/')
            }
          )
        })
        .catch(err => {
          const errCode = err.code
          setError(errCode)
          setLoading(false)
        })
    })
  }
  const forgotPassword = (email, setSuccess, setError) => {
    sendPasswordResetEmail(auth, email)
      .then(() => {
        setSuccess('Email sent! Check your inbox for instructions.')
        console.log('email sent')
      })
      .catch(err => {
        console.log(err)
        setError(err.code)
      })
  }

  const getUsername = async uid => {
    // Get reference to username collection document with property of the passed uid
    const usernamesRef = doc(db, 'username', uid)
    const usernamesSnap = await getDoc(usernamesRef)

    if (usernamesSnap.exists()) {
      const currUsername = usernamesSnap.data().username
      return currUsername
    } else {
      navigate('/create-username')
      return null
    }
  }

  const checkUsernameAvailability = async (username, setLoading) => {
    if (setLoading) {
      setLoading(true)
    }

    const usernamesRef = collection(db, 'username')
    const q = query(usernamesRef, where('username', '==', username))

    const usernamesQuerySnapshot = await getDocs(q)
    if (usernamesQuerySnapshot.empty) {
      return true
    }
    return false
  }

  const setUsername = async (
    uid,
    username,
    setLoading,
    setSuccess,
    setError
  ) => {
    if (setLoading) setLoading(true)

    const isAvailable = await checkUsernameAvailability(username)
    if (!isAvailable) {
      if (setError) return setError(`${username} has already been taken`)
    }

    const usernameData = { username }

    const usernamesRef = doc(db, 'username', uid)
    await setDoc(usernamesRef, usernameData)
    // If setSuccess exists, set it's message
    return setSuccess ? setSuccess('Username successfully created!') : null
  }

  // Check for auth status on page load
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(userInstance => {
      if (userInstance) {
        // Gets type of authentication, ie... password, google...
        const providerId = userInstance.providerData[0].providerId

        // If the authentication is anything other than password, send getUsername to check if username exists for that user
        if (providerId !== 'password') {
          getUsername(userInstance.uid)
        }

        console.log('logged in')
        setUser(userInstance)
      } else {
        console.log('logged out')
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = {
    user,
    logout,
    signInWithGoogle,
    signInDefault,
    signUp,
    getUsername,
    forgotPassword,
    checkUsernameAvailability,
    setUsername,
  }

  return (
    <AuthContext.Provider value={value}>
      {loading ? <div>Loading auth....</div> : <>{children}</>}
    </AuthContext.Provider>
  )
}

export default AuthProvider
