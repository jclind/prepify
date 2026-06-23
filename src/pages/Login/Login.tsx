import React, { FC, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import './Login.scss'
import '../../Components/Form/FormStyles.scss'
import FormInput from 'src/Components/Form/FormInput'
import { useAuth } from 'src/context/AuthContext'
import { AiOutlineGoogle } from 'react-icons/ai'
import { MdOutlineEmail, MdOutlineLock } from 'react-icons/md'
import { TailSpin } from 'react-loader-spinner'
import { Helmet } from 'react-helmet-async'

const Login: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const authRes = useAuth()

  const handleEmailAndPasswordFormSubmit = (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault()
    setError('')
    authRes?.signInDefault(email, password, remember, setLoading, setError)
  }

  return authRes?.user ? (
    <Navigate to='/' />
  ) : (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Log In · Prepify</title>
      </Helmet>
      <div className='login-page form-format'>
        <div className='form-container'>
          <div className='brand-mark'>P</div>
          <form onSubmit={handleEmailAndPasswordFormSubmit} className='form'>
            <h1 className='title'>Welcome back</h1>
            <div aria-live='polite'>
              {error ? <div className='error'>{error}</div> : null}
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
              <FormInput
                icon={<MdOutlineLock className='icon' />}
                type='password'
                name='password'
                label='Password'
                autoComplete='current-password'
                val={password}
                setVal={setPassword}
                placeholder='Your password'
              />
            </div>
            <div className='form-meta'>
              <label className='remember'>
                <input
                  type='checkbox'
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                />
                Remember me
              </label>
              <Link to='/forgot-password' className='forgot-password-prompt'>
                Forgot password?
              </Link>
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
                'Log in'
              )}
            </button>
          </form>
          <div className='divider'>or</div>
          <button
            className='google-btn btn'
            onClick={() => {
              setError('')
              authRes?.signInWithGoogle(setError)
            }}
          >
            <AiOutlineGoogle className='icon' /> Continue with Google
          </button>
          <p className='switch-prompt'>
            New to Prepify?{' '}
            <Link to='/signup' className='prompt-btn'>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  )
}

export default Login
