import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import './ForgotPassword.scss'
import '../Form/FormStyles.scss'
import FormInput from '../Form/FormInput'
import { MdOutlineEmail } from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'
import PrepifyLogo from '../Navbar/PrepifyLogo'
import { Helmet } from 'react-helmet'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')

  const { forgotPassword } = useAuth()

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChangePasswordFormSubmit = e => {
    e.preventDefault()
    setError('')
    setSuccess('')
    forgotPassword(email, setSuccess, setError)
  }

  return (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Forgot Password</title>
      </Helmet>
      <div className='abs-logo'>
        <PrepifyLogo className='abs-logo' />
      </div>
      <div className='forgot-password-page form-format'>
        <div className='login-form-container'>
          <form onSubmit={handleChangePasswordFormSubmit} className='form'>
            <h1 className='title'>Forgot Password?</h1>
            <p className='prompt'>
              Enter your email to receive a link to reset your password.
            </p>
            {error ? <div className='error'>{error}</div> : null}
            {success ? <div className='success'>{success}</div> : null}
            <div className='input-fields'>
              <FormInput
                icon={<MdOutlineEmail className='icon' />}
                type='email'
                name='email'
                val={email}
                setVal={setEmail}
                placeholder='name@example.com'
              />
            </div>
            <button className='form-action-btn btn'>Send Email</button>
          </form>
          <Link to='/login' className='back-to-login'>
            Return to Login
          </Link>
        </div>
      </div>
    </>
  )
}

export default ForgotPassword
