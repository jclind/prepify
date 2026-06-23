import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import './ForgotPassword.scss'
import '../../Components/Form/FormStyles.scss'
import FormInput from 'src/Components/Form/FormInput'
import { MdOutlineEmail } from 'react-icons/md'
import { useAuth } from 'src/context/AuthContext'
import { TailSpin } from 'react-loader-spinner'
import { Helmet } from 'react-helmet-async'

const ForgotPassword: FC = () => {
  const [email, setEmail] = useState('')

  const authRes = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChangePasswordFormSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    authRes?.forgotPassword(email, setLoading, setSuccess, setError)
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Reset Password · Prepify</title>
      </Helmet>
      <div className='forgot-password-page form-format'>
        <div className='login-form-container'>
          <div className='brand-mark'>P</div>
          <form onSubmit={handleChangePasswordFormSubmit} className='form'>
            <h1 className='title'>Reset your password</h1>
            <p className='prompt'>
              Enter your email and we'll send you a link to get back in.
            </p>
            <div aria-live='polite'>
              {error ? <div className='error'>{error}</div> : null}
              {success ? <div className='success'>{success}</div> : null}
            </div>
            <div className='input-fields'>
              <FormInput
                icon={<MdOutlineEmail className='icon' />}
                type='email'
                name='email'
                label='Email'
                autoComplete='email'
                val={email}
                setVal={setEmail}
                placeholder='name@example.com'
              />
            </div>
            <button className='form-action-btn btn' disabled={loading}>
              {loading ? (
                <TailSpin
                  height='28'
                  width='28'
                  color='white'
                  ariaLabel='loading'
                />
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
          <p className='switch-prompt'>
            Remembered it?{' '}
            <Link to='/login' className='prompt-btn'>
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default ForgotPassword
