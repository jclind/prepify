import React, { ChangeEvent, useState } from 'react'
import '../../Components/Form/FormStyles.scss'
import './CreateUsername.scss'
import { TailSpin } from 'react-loader-spinner'
import { useNavigate } from 'react-router-dom'
import UsernameInput from '../../Components/Form/UsernameInput'
import AuthAPI from 'src/api/auth'

const CreateUsername = () => {
  const [currUsername, setCurrUsername] = useState('')
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null)

  const [loadingCreateUsername, setLoadingCreateUsername] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  const uid = AuthAPI.getUID()

  const handleCreateUsernameForm = (e: ChangeEvent<HTMLFormElement>) => {
    if (uid && isUsernameAvailable) {
      e.preventDefault()
      setLoadingCreateUsername(true)

      setError('')
      setSuccess('')

      AuthAPI.setUsername(uid, currUsername)
        .then(() => {
          setLoadingCreateUsername(false)
          setSuccess('Username Created Successfully!')
          navigate('/')
        })
        .catch((error: any) => {
          setLoadingCreateUsername(false)
          setError(error.message.toString())
        })
    }
  }

  return (
    <div className='create-username-page form-format'>
      <div className='login-form-container'>
        <form onSubmit={handleCreateUsernameForm} className='form'>
          <h1 className='title'>One last step...</h1>
          <p className='prompt'>
            Create a unique username to identify yourself with.
          </p>
          {success ? <div className='success'>{success}</div> : null}
          {error ? <div className='error'>{error}</div> : null}
          <div className='input-fields'>
            <UsernameInput
              username={currUsername}
              setUsername={setCurrUsername}
              setSuccess={setSuccess}
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
        </form>
      </div>
    </div>
  )
}

export default CreateUsername
