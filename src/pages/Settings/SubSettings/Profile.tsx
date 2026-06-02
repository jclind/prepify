import React, { FC, useEffect, useState } from 'react'
import './SubSettings.scss'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import toast from 'react-hot-toast'
import { TailSpin } from 'react-loader-spinner'
import { AiOutlineClose } from 'react-icons/ai'
import InputContainer from 'src/pages/Settings/SubSettings/InputContainer'
import { useQuery } from '@tanstack/react-query'

const MAX_FILE_SIZE = 5000 * 1024

const Profile: FC = () => {
  const [saveLoading, setSaveLoading] = useState(false)

  const [imgURL, setImgURL] = useState('')
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const authRes = useAuth()
  const uid = AuthAPI.getUID()

  const { data: fetchedUsername, isLoading } = useQuery({
    queryKey: ['username', uid],
    queryFn: () => AuthAPI.getUsername(),
    enabled: !!uid,
  })

  useEffect(() => {
    if (fetchedUsername !== undefined && authRes?.user) {
      setUsername(fetchedUsername || '')
      setDisplayName(authRes.user.displayName || '')
      setImgURL(authRes.user.photoURL || '')
      setEmail(authRes.user.email || '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedUsername, authRes?.user])

  const nameInitial = authRes?.user?.displayName
    ? authRes.user.displayName.charAt(0).toUpperCase()
    : fetchedUsername?.charAt(0).toUpperCase() || 'null'

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && /\.(jpe?g|png)$/i.test(file.name)) {
      if (file.size > MAX_FILE_SIZE) {
        setImgFile(null)
        setImgURL('')
        toast.error('File cannot be more than 5mb in size')
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
      return toast.error('Display Name Is Required.')
    } else if (!username) {
      setSaveLoading(false)
      return toast.error('Username Name Is Required.')
    } else if (!email) {
      setSaveLoading(false)
      return toast.error('Email Is Required.')
    } else if (
      imgURL === authRes?.user?.photoURL &&
      email === authRes?.user?.email &&
      imgURL === authRes?.user?.photoURL &&
      displayName === authRes?.user?.displayName &&
      username === fetchedUsername
    ) {
      setSaveLoading(false)
      return toast.error('No Changes To Submit.', { duration: 3000 })
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
        toast.success('Profile updated!', { duration: 3000 })
      })
      .catch(err => {
        setSaveLoading(false)

        if (err.code === 'password-required') {
          toast.error(err.message, { duration: 3000 })
        } else if (
          err.code === 'auth/user-mismatch' ||
          err.code === 'auth/wrong-password'
        ) {
          toast.error('Password incorrect, please try again.')
        } else if (err.code === 'auth/email-already-in-use') {
          toast.error('Email already in use.')
        } else {
          toast.error(err.message)
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
          email !== authRes?.user?.email && !isLoading ? 'show' : 'hide'
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
