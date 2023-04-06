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
  updateProfile,
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
} from 'firebase/auth'

import { useNavigate } from 'react-router-dom'
import AuthAPI from 'src/api/auth'
import { TailSpin } from 'react-loader-spinner'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { ErrorWithData } from 'src/util/ErrorWithData'

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
    displayName: string,
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
  updateProfileData: (data: {
    displayName?: string
    username?: string
    imgFile?: File | null
    email?: string
    password?: string
  }) => Promise<void>
  changePassword: (oldPass: string, newPass: string) => Promise<void>
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
    displayName: string,
    setLoading: (val: boolean) => void,
    setSuccess: (val: string) => void,
    setError: (val: string) => void
  ) => {
    setLoading(true)
    if (!username) {
      setLoading(false)
      return setError('Must enter username')
    } else if (!email) {
      setLoading(false)
      return setError('Must enter email')
    } else if (!password) {
      setLoading(false)
      return setError('Must enter password')
    }

    AuthAPI.checkUsernameAvailability(username).then(isAvailable => {
      if (!isAvailable) {
        setLoading(false)
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
          updateProfile(cred.user, {
            displayName: displayName,
          })
        })
        .catch(err => {
          const errCode = err.code
          if (err.code === 'auth/weak-password') {
            setError('Password must be 6 characters or more')
          } else if (err.code === 'auth/email-already-in-use') {
            setError('Email is already in use')
          } else {
            setError(errCode)
          }
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

      const storage = getStorage()
      let profilePhotoURL = ''
      if (imgFile) {
        const profilePhotosRef = ref(storage, `profilePhotos/${imgFile.name}`)
        await uploadBytes(profilePhotosRef, imgFile)
        profilePhotoURL = await getDownloadURL(profilePhotosRef)
      }
      if (username && username !== currUsername) {
        await AuthAPI.setUsername(user.uid, username)
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
        await updateEmail(user, email)
      }
      await updateProfile(user, {
        ...(profilePhotoURL ? { photoURL: profilePhotoURL } : { photoURL: '' }),
        ...(displayName && { displayName }),
      })
    }
  }
  const changePassword = async (oldPass: string, newPass: string) => {
    if (user && user.email) {
      const credential = EmailAuthProvider.credential(user.email, oldPass)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, newPass)
    }
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
    updateProfileData,
    changePassword,
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
