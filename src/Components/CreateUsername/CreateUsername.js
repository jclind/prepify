import React, { useState } from 'react'
import '../Form/FormStyles.scss'
import './CreateUsername.scss'
import { useAuth } from '../../context/AuthContext'
import { TailSpin } from 'react-loader-spinner'
import { useNavigate } from 'react-router-dom'
import UsernameInput from '../Form/UsernameInput'

const CreateUsername = () => {
  const [currUsername, setCurrUsername] = useState('')

  const [loadingCreateUsername, setLoadingCreateUsername] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const navigate = useNavigate()

  const { setUsername, user } = useAuth()

  const uid = user ? user.uid : null

  const handleCreateUsernameForm = e => {
    e.preventDefault()

    setError('')
    setSuccess('')

    setUsername(
      uid,
      currUsername,
      setLoadingCreateUsername,
      setSuccess,
      setError
    ).then(() => {
      setLoadingCreateUsername(false)
      navigate('/')
    })
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
            />
          </div>
          <button className='form-action-btn btn'>
            {loadingCreateUsername ? (
              <TailSpin
                height='30'
                width='30'
                color='white'
                arialLabel='loading'
                className='spinner'
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
