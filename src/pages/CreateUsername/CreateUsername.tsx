import React, { ChangeEvent, FC, useEffect, useState } from 'react'
import '../../Components/Form/FormStyles.scss'
import './CreateUsername.scss'
import { TailSpin } from 'react-loader-spinner'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import UsernameInput from 'src/Components/Form/UsernameInput'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

const CreateUsername: FC = () => {
  const [currUsername, setCurrUsername] = useState('')
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null)

  const [loadingCreateUsername, setLoadingCreateUsername] = useState(false)
  // Block rendering the form until we've confirmed the user actually needs it,
  // so a user who already has a username never sees a flash of the form.
  const [checkingExisting, setCheckingExisting] = useState(true)

  const [error, setError] = useState('')

  const navigate = useNavigate()

  const auth = useAuth()
  const user = auth?.user ?? null
  const authLoading = auth?.authLoading ?? false

  // Guard the page: only username-less, signed-in users belong here. Send
  // everyone else away rather than letting them set/overwrite a username.
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/login')
      return
    }
    let cancelled = false
    AuthAPI.getUsername()
      .then(username => {
        if (cancelled) return
        if (username) navigate('/')
        else setCheckingExisting(false)
      })
      .catch(() => {
        // If we can't confirm, let them proceed — setting a username is
        // idempotent and the server still enforces uniqueness.
        if (!cancelled) setCheckingExisting(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, user, navigate])

  const handleCreateUsernameForm = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault()

    const uid = user?.uid
    if (!uid) {
      setError('You must be signed in to create a username.')
      return
    }
    if (!isUsernameAvailable) return

    setLoadingCreateUsername(true)
    setError('')

    AuthAPI.setUsername(currUsername)
      .then(() => {
        setLoadingCreateUsername(false)
        // A toast (rendered at the app root) survives the redirect, unlike an
        // inline message on a page we immediately navigate away from.
        toast.success('Username created successfully!')
        navigate('/')
      })
      .catch((error: unknown) => {
        setLoadingCreateUsername(false)
        setError(error instanceof Error ? error.message : String(error))
      })
  }

  if (authLoading || checkingExisting) {
    return (
      <div className='create-username-page form-format'>
        <div className='login-form-container loading-state'>
          <TailSpin height='50' width='50' color='gray' ariaLabel='loading' />
        </div>
      </div>
    )
  }

  return (
    <div className='create-username-page form-format'>
      <div className='login-form-container'>
        <form onSubmit={handleCreateUsernameForm} className='form'>
          <h1 className='title'>One last step...</h1>
          <p className='prompt'>
            Create a unique username to identify yourself with.
          </p>
          {error ? <div className='error'>{error}</div> : null}
          <div className='input-fields'>
            <UsernameInput
              username={currUsername}
              setUsername={setCurrUsername}
              setSuccess={() => {}}
              setError={setError}
              isUsernameAvailable={isUsernameAvailable}
              setIsUsernameAvailable={setIsUsernameAvailable}
            />
          </div>
          <button
            className='form-action-btn btn'
            disabled={loadingCreateUsername}
          >
            {loadingCreateUsername ? (
              <TailSpin
                height='30'
                width='30'
                color='white'
                ariaLabel='loading'
              />
            ) : (
              'Create Username'
            )}
          </button>
          <button
            type='button'
            className='logout-prompt'
            onClick={() => auth?.logout()}
          >
            Cancel and log out
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateUsername
