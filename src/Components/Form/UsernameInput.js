import React, { useState, useEffect } from 'react'
import FormInput from './FormInput'
import { AiOutlineUser } from 'react-icons/ai'
import { useAuth } from '../../context/AuthContext'

const UsernameInput = ({ username, setUsername, setSuccess, setError }) => {
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(null)

  const { checkUsernameAvailability } = useAuth()

  // on username change, check username availability against firestore 'usernames' collection
  useEffect(() => {
    setError('')
    setSuccess('')

    if (/\s/g.test(username))
      return setError('Cannot have white space in username')
    if (!username || username.length < 3) return setIsUsernameAvailable(null)

    checkUsernameAvailability(username)
      .then(val => {
        setIsUsernameAvailable(val)
        console.log(val)
      })
      .catch(err => setError(err.code))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username])

  return (
    <>
      <FormInput
        icon={<AiOutlineUser className='icon' />}
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
