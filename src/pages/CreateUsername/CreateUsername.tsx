import React, { ChangeEvent, FC, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import '../../Components/Form/FormStyles.scss'
import './CreateUsername.scss'
import { TailSpin } from 'react-loader-spinner'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AiOutlineUser } from 'react-icons/ai'
import { MdOutlineLocationOn } from 'react-icons/md'
import UsernameInput from 'src/Components/Form/UsernameInput'
import FormInput from 'src/Components/Form/FormInput'
import AuthAPI from 'src/api/auth'
import { getApiErrorMessage } from 'src/util/getApiErrorMessage'
import { useAuth } from 'src/context/AuthContext'

const BIO_MAX = 300
const LOCATION_MAX = 80

const CreateUsername: FC = () => {
  const [currUsername, setCurrUsername] = useState('')
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null)

  // Optional profile details — username is the only required field.
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')

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

  const handleSubmit = (e: ChangeEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!user?.uid) {
      setError('You must be signed in to continue.')
      return
    }
    if (!isUsernameAvailable) return

    setLoadingCreateUsername(true)
    setError('')

    // Username first (the required identity); optional details only when filled.
    // Each step is independent so a failure surfaces its own message.
    ;(async () => {
      try {
        await AuthAPI.setUsername(currUsername)
        if (displayName.trim()) {
          // Moderated server-side before it's set on the Firebase Auth profile
          // (a rejected name throws and surfaces below); reload to reflect it.
          await AuthAPI.updateDisplayName(displayName.trim())
          await user.reload()
        }
        if (bio.trim() || location.trim()) {
          await AuthAPI.updateProfile({
            bio: bio.trim(),
            location: location.trim(),
          })
        }
        setLoadingCreateUsername(false)
        // A toast (rendered at the app root) survives the redirect, unlike an
        // inline message on a page we immediately navigate away from.
        toast.success('Welcome to Prepify!')
        navigate('/')
      } catch (err: unknown) {
        setLoadingCreateUsername(false)
        // Prefer the server's reason (e.g. a 422 moderation block on the
        // username) over axios's generic "Request failed with status code 422".
        setError(getApiErrorMessage(err, 'Something went wrong. Please try again.'))
      }
    })()
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
      <Helmet>
        <title>Choose a Username · Prepify</title>
        <meta name='robots' content='noindex' />
      </Helmet>
      <div className='login-form-container'>
        <div className='brand-mark'>P</div>
        <form onSubmit={handleSubmit} className='form'>
          <h1 className='title'>Finish your profile</h1>
          <p className='prompt'>
            Pick a username to get started — everything else is optional and you
            can change it anytime.
          </p>
          <div aria-live='polite'>
            {error ? <div className='error'>{error}</div> : null}
          </div>
          <div className='input-fields'>
            <UsernameInput
              username={currUsername}
              setUsername={setCurrUsername}
              setSuccess={() => {}}
              setError={setError}
              isUsernameAvailable={isUsernameAvailable}
              setIsUsernameAvailable={setIsUsernameAvailable}
            />

            <div className='optional-divider'>
              <span>Optional</span>
            </div>

            <FormInput
              icon={<AiOutlineUser className='icon' />}
              type='text'
              name='display-name'
              label='Display name'
              autoComplete='name'
              required={false}
              val={displayName}
              setVal={setDisplayName}
              placeholder='John Smith'
            />
            <FormInput
              icon={<MdOutlineLocationOn className='icon' />}
              type='text'
              name='location'
              label='Location'
              autoComplete='off'
              required={false}
              maxLength={LOCATION_MAX}
              val={location}
              setVal={setLocation}
              placeholder='Toronto, Canada'
            />
            <label className='form-input form-input--md'>
              <span className='label-title'>Bio</span>
              <textarea
                className='form-textarea'
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder='Tell others a little about yourself'
                maxLength={BIO_MAX}
                rows={3}
              />
              <span className='input-hint input-hint--ok'>
                {bio.length}/{BIO_MAX}
              </span>
            </label>
          </div>
          <button
            className='form-action-btn btn'
            disabled={loadingCreateUsername || !isUsernameAvailable}
          >
            {loadingCreateUsername ? (
              <TailSpin
                height='28'
                width='28'
                color='white'
                ariaLabel='loading'
              />
            ) : (
              'Continue'
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
