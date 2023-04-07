import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import './Login.scss'
import '../../Components/Form/FormStyles.scss'
import FormInput from '../../Components/Form/FormInput'
import { useAuth } from '../../context/AuthContext'
import { AiOutlineGoogle } from 'react-icons/ai'
import { MdOutlineEmail, MdOutlineLock } from 'react-icons/md'
import PrepifyLogo from '../../Components/Navbar/PrepifyLogo'
import { Helmet } from 'react-helmet'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [error, setError] = useState('')

  const authRes = useAuth()

  const handleEmailAndPasswordFormSubmit = (e: any) => {
    e.preventDefault()
    setError('')
    authRes?.signInDefault(email, password, setError)
  }

  return authRes?.user ? (
    <Navigate to='/' />
  ) : (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Login</title>
      </Helmet>
      <div className='abs-logo'>
        <PrepifyLogo />
      </div>
      <div className='login-page form-format'>
        <div className='form-container'>
          <form onSubmit={handleEmailAndPasswordFormSubmit} className='form'>
            <h1 className='title'>Login</h1>
            <p className='prompt'>
              Don't have an account yet?{' '}
              <Link to='/signup' className='prompt-btn'>
                Sign Up
              </Link>{' '}
            </p>
            {error ? <div className='error'>{error}</div> : null}
            <div className='input-fields'>
              <FormInput
                icon={<MdOutlineEmail className='icon' />}
                type='email'
                name='email'
                val={email}
                setVal={setEmail}
                placeholder='name@example.com'
              />
              <FormInput
                icon={<MdOutlineLock className='icon' />}
                type='password'
                name='password'
                val={password}
                setVal={setPassword}
                placeholder='6+ Characters'
              />
              <Link to='/forgot-password' className='forgot-password-prompt'>
                Forgot Password
              </Link>
            </div>
            <button className='form-action-btn btn'>Login</button>
          </form>
          <button
            className='google-btn btn'
            onClick={() => authRes?.signInWithGoogle(setError)}
          >
            <AiOutlineGoogle className='icon' /> Log In With Google
          </button>
        </div>
      </div>
    </>
  )
}
// Work on functionality for all log in, sign up, and forgot password forms
export default Login
