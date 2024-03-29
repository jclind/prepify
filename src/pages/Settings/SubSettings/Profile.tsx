import React, { FC, useEffect, useState } from 'react'
import './SubSettings.scss'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import { useAlert } from 'react-alert'
import { TailSpin } from 'react-loader-spinner'
import { AiOutlineClose } from 'react-icons/ai'
import InputContainer from './InputContainer'

const MAX_FILE_SIZE = 5000 * 1024

const Profile: FC = () => {
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)

  const [imgURL, setImgURL] = useState('')
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [nameInitial, setNameInitial] = useState('')

  const alert = useAlert()

  const authRes = useAuth()
  useEffect(() => {
    setLoading(true)
    if (authRes?.user) {
      AuthAPI.getUsername()
        .then(usernameRes => {
          setOriginalUsername(usernameRes || '')
          setUsername(usernameRes || '')
          setDisplayName(authRes.user?.displayName || '')
          setImgURL(authRes.user?.photoURL || '')
          setEmail(authRes.user?.email || '')

          if (authRes?.user?.displayName) {
            const i = authRes.user.displayName.charAt(0).toUpperCase()
            setNameInitial(i)
          } else {
            const i = usernameRes?.charAt(0).toUpperCase()
            setNameInitial(i || 'null')
          }

          setLoading(false)
        })
        .catch(err => {
          alert.show(<div>Something went wrong, try logging in again.</div>, {
            timeout: 5000,
            type: 'error',
          })
          setLoading(false)
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authRes?.user])

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && /\.(jpe?g|png)$/i.test(file.name)) {
      if (file.size > MAX_FILE_SIZE) {
        setImgFile(null)
        setImgURL('')
        alert.show('File cannot be more than 5mb in size', {
          timeout: 5000,
          type: 'error',
        })
      }
      setImgFile(file)
      setImgURL(URL.createObjectURL(file))
    } else {
      setImgFile(null)
      setImgURL('')
    }
  }

  const handleSaveChanges = () => {
    setSaveLoading(true)

    if (!displayName) {
      setSaveLoading(false)
      return alert.show('Display Name Is Required.', {
        timeout: 5000,
        type: 'error',
      })
    } else if (!username) {
      setSaveLoading(false)
      return alert.show('Username Name Is Required.', {
        timeout: 5000,
        type: 'error',
      })
    } else if (!email) {
      setSaveLoading(false)
      return alert.show('Email Is Required.', {
        timeout: 5000,
        type: 'error',
      })
    } else if (
      imgURL === authRes?.user?.photoURL &&
      email === authRes?.user?.email &&
      imgURL === authRes?.user?.photoURL &&
      displayName === authRes?.user?.displayName &&
      username === originalUsername
    ) {
      setSaveLoading(false)
      return alert.show('No Changes To Submit.', {
        timeout: 3000,
        type: 'error',
      })
    }
    const data = {
      ...(displayName !== authRes?.user?.displayName && { displayName }),
      ...(imgURL !== authRes?.user?.photoURL ? { imgFile } : { imgFile: null }),
      ...(email !== authRes?.user?.email && { email }),
      ...(password && { password }),
      username,
    }
    authRes
      ?.updateProfileData(data)
      .then(() => {
        setSaveLoading(false)
        alert.show('Profile updated!', {
          timeout: 3000,
          type: 'success',
        })
      })
      .catch(err => {
        setSaveLoading(false)

        if (err.code === 'password-required') {
          alert.show(err.message, {
            timeout: 3000,
            type: 'error',
          })
        } else if (
          err.code === 'auth/user-mismatch' ||
          err.code === 'auth/wrong-password'
        ) {
          alert.show('Password incorrect, please try again.', {
            timeout: 5000,
            type: 'error',
          })
        } else if (err.code === 'auth/email-already-in-use') {
          alert.show('Email already in use.', {
            timeout: 5000,
            type: 'error',
          })
        } else {
          alert.show(err.message, {
            timeout: 5000,
            type: 'error',
          })
        }
      })
  }

  return (
    <div className='settings-component'>
      <div className='user-photo-row'>
        <div className='user-photo-container'>
          {imgURL ? (
            <>
              <img src={imgURL} alt='profile avatar' className='profile-img' />
              <button
                className='remove-img-btn'
                onClick={() => {
                  setImgFile(null)
                  setImgURL('')
                }}
              >
                <AiOutlineClose className='close-icon' />
              </button>
            </>
          ) : (
            <div className='profile-img not-set'>{nameInitial}</div>
          )}
        </div>
        <div className='upload-img-container'>
          <label htmlFor='upload-img' className='upload-img' tabIndex={0}>
            Upload Photo
          </label>
          <input
            type='file'
            id='upload-img'
            accept='.jpg,.jpeg,.png'
            onChange={handleFileSelected}
            style={{ display: 'none' }}
          />
          <p className='text'>File cannot be more than 5mb.</p>
        </div>
      </div>
      <div className='input-row'>
        <InputContainer
          label='Display Name'
          val={displayName}
          setVal={setDisplayName}
          placeholder={username}
        />
        <InputContainer
          label='Username'
          val={username}
          setVal={setUsername}
          placeholder={username}
        />
      </div>
      <div className='input-row'>
        <InputContainer
          label='Email'
          val={email}
          setVal={setEmail}
          placeholder={email}
        />
      </div>
      <div
        className={`input-row password-input-container ${
          email !== authRes?.user?.email && !loading ? 'show' : 'hide'
        }`}
      >
        <InputContainer
          label='Password (Reauthenticate)'
          val={password}
          setVal={setPassword}
          type='password'
          placeholder='Authentication For Email Change'
        />
      </div>
      <button
        className='save-btn'
        onClick={handleSaveChanges}
        disabled={saveLoading}
      >
        {saveLoading ? (
          <TailSpin height='25' width='25' color='white' ariaLabel='loading' />
        ) : (
          'Save Changes'
        )}
      </button>
    </div>
  )
}

export default Profile
