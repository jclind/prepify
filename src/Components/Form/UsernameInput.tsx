import React, { useEffect, FC } from 'react'
import FormInput from 'src/Components/Form/FormInput'
import { MdAlternateEmail } from 'react-icons/md'
import AuthAPI from 'src/api/auth'

type UsernameInputProps = {
  username: string
  setUsername: (val: string) => void
  setSuccess: (val: string) => void
  setError: (val: string) => void
  isUsernameAvailable: boolean | null
  setIsUsernameAvailable: (val: boolean | null) => void
}

const UsernameInput: FC<UsernameInputProps> = ({
  username,
  setUsername,
  setSuccess,
  setError,
  isUsernameAvailable,
  setIsUsernameAvailable,
}) => {
  // on username change, check availability against the 'usernames' collection
  useEffect(() => {
    setError('')
    setSuccess('')

    if (/\s/g.test(username))
      return setError('Cannot have white space in username')
    if (!username || username.length < 3) return setIsUsernameAvailable(null)

    // `cancelled` guards against a slow in-flight request resolving after a
    // newer keystroke's request and clobbering the result with stale data.
    let cancelled = false

    const timeoutId = setTimeout(() => {
      AuthAPI.checkUsernameAvailability(username)
        .then(val => {
          if (!cancelled) setIsUsernameAvailable(val)
        })
        .catch(err => {
          if (!cancelled) setError(err.code)
        })
    }, 500) // 500 milliseconds debounce time

    // Clears the pending debounce and ignores any in-flight response on the
    // next keystroke or unmount.
    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  return (
    <>
      <FormInput
        icon={<MdAlternateEmail className='icon' />}
        type='text'
        name='username'
        label='Username'
        autoComplete='username'
        val={username}
        setVal={setUsername}
        placeholder='johnsmith'
      />
      {isUsernameAvailable === null ? null : (
        <>
          {isUsernameAvailable ? (
            <p className='available'>{username} is available</p>
          ) : (
            <p className='not-available'>{username} has already been taken</p>
          )}
        </>
      )}
    </>
  )
}

export default UsernameInput
