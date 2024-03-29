import React, { useEffect, FC, useState } from 'react'
import FormInput from './FormInput'
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
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)

  // on username change, check username availability against firestore 'usernames' collection
  useEffect(() => {
    setError('')
    setSuccess('')

    if (/\s/g.test(username))
      return setError('Cannot have white space in username')
    if (!username || username.length < 3) return setIsUsernameAvailable(null)

    if (timeoutId) clearTimeout(timeoutId)

    const newTimeoutId = setTimeout(() => {
      AuthAPI.checkUsernameAvailability(username)
        .then(val => {
          setIsUsernameAvailable(val)
        })
        .catch(err => setError(err.code))
    }, 500) // 500 milliseconds debounce time

    setTimeoutId(newTimeoutId)

    // cleanup function to clear timeout on unmount or username change
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  return (
    <>
      <FormInput
        icon={<MdAlternateEmail className='icon' />}
        type='username'
        name='username'
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
