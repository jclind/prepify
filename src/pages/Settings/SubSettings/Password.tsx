import React, { useState } from 'react'
import './SubSettings.scss'
import InputContainer from './InputContainer'
import { useAuth } from 'src/context/AuthContext'
import { useAlert } from 'react-alert'
import { TailSpin } from 'react-loader-spinner'

const Password = () => {
  const [updateLoading, setUpdateLoading] = useState(false)

  const [currPass, setCurrPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const [passErrors, setPassErrors] = useState<{
    currPass: string
    newPass: string
    confirmPass: string
  }>({ currPass: '', newPass: '', confirmPass: '' })

  const [showPasswords, setShowPasswords] = useState(false)

  const authRes = useAuth()
  const alert = useAlert()

  const clearPasswords = () => {
    setCurrPass('')
    setNewPass('')
    setConfirmPass('')
  }

  const handleChangePassword = () => {
    setPassErrors({ currPass: '', newPass: '', confirmPass: '' })
    if (authRes?.user) {
      setUpdateLoading(true)
      if (!currPass || !newPass || !confirmPass) {
        setUpdateLoading(false)
        return setPassErrors(prev => ({
          ...prev,
          ...(!currPass && { currPass: 'Current Password Required' }),
          ...(!newPass && { newPass: 'New Password Required' }),
          ...(!confirmPass && {
            confirmPass: 'Confirmation Password Required',
          }),
        }))
      }

      if (newPass !== confirmPass) {
        setUpdateLoading(false)
        return setPassErrors(prev => ({
          ...prev,
          newPass: 'New Passwords Not Matching',
          confirmPass: 'New Passwords Not Matching',
        }))
      } else if (newPass.length < 6) {
        setUpdateLoading(false)
        return setPassErrors(prev => ({
          ...prev,
          newPass: 'Password Must Be At Least 6 Characters',
        }))
      } else if (currPass === newPass) {
        setUpdateLoading(false)
        return setPassErrors(prev => ({
          ...prev,
          newPass: 'New Password Be Same As Old',
        }))
      }
      authRes
        .changePassword(currPass, newPass)
        .then(() => {
          setUpdateLoading(false)
          clearPasswords()
          alert.show('Password Successfully Changed!', {
            timeout: 5000,
            type: 'success',
          })
        })
        .catch(err => {
          if (err.code === 'auth/wrong-password') {
            setPassErrors(prev => ({
              ...prev,
              currPass: 'Incorrect Password, Try Again.',
            }))
          }
          setUpdateLoading(false)
          console.log(err, err.code)
        })
    }
  }

  return (
    <div className='settings-component'>
      <div className='update-password'>
        <InputContainer
          label='Current Password'
          val={currPass}
          setVal={setCurrPass}
          type={showPasswords ? 'text' : 'password'}
          error={passErrors.currPass}
        />
        <InputContainer
          label='New Password'
          val={newPass}
          setVal={setNewPass}
          type={showPasswords ? 'text' : 'password'}
          error={passErrors.newPass}
        />
        <InputContainer
          label='Confirm New Password'
          val={confirmPass}
          setVal={setConfirmPass}
          type={showPasswords ? 'text' : 'password'}
          error={passErrors.confirmPass}
        />
        <div className='actions'>
          <button
            className='save-btn'
            onClick={handleChangePassword}
            disabled={updateLoading}
          >
            {updateLoading ? (
              <TailSpin
                height='25'
                width='25'
                color='white'
                ariaLabel='loading'
              />
            ) : (
              'Update'
            )}
          </button>
          <button
            className='view-passwords'
            onClick={() => setShowPasswords(prev => !prev)}
          >
            {showPasswords ? 'hide' : 'show'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Password
