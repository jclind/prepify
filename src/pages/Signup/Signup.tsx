import { EmailIcon, GoogleColorIcon, LockIcon } from 'src/Components/icons'
import React, { ChangeEvent, FC, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from 'src/context/AuthContext'
import { TailSpin } from 'react-loader-spinner'
import { Helmet } from 'react-helmet-async'

import './Signup.scss'
import '../../Components/Form/FormStyles.scss'

import FormInput from 'src/Components/Form/FormInput'

const Signup: FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const authRes = useAuth()

  const handleEmailAndPasswordFormSubmit = (
    e: ChangeEvent<HTMLFormElement>
  ) => {
    e.preventDefault()
    setError('')

    // Catch typos before hitting Firebase — a mismatched confirm is the most
    // common signup mistake and otherwise can't be detected after the fact.
    if (password !== confirmPassword) {
      return setError('Passwords do not match.')
    }

    // Username + optional profile details are collected on the next step.
    authRes?.signUp(email, password, setLoading, setError)
  }

  return authRes?.user ? (
    <Navigate to='/' />
  ) : (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Sign Up · Prepify</title>
      </Helmet>
      <main className='signup-page form-format'>
        <div className='form-container'>
          <div className='brand-mark'>P</div>
          <form onSubmit={handleEmailAndPasswordFormSubmit} className='form'>
            <h1 className='title'>Create your account</h1>
            <div aria-live='polite'>
              {error ? <div className='error'>{error}</div> : null}
            </div>
            <div className='input-fields'>
              <FormInput
                icon={<EmailIcon className='icon' />}
                type='email'
                name='email'
                label='Email'
                autoComplete='email'
                val={email}
                setVal={setEmail}
                placeholder='name@example.com'
              />
              <FormInput
                icon={<LockIcon className='icon' />}
                type='password'
                name='password'
                label='Password'
                autoComplete='new-password'
                val={password}
                setVal={setPassword}
                placeholder='6+ characters'
              />
              <FormInput
                icon={<LockIcon className='icon' />}
                type='password'
                name='confirm-password'
                label='Confirm password'
                autoComplete='new-password'
                val={confirmPassword}
                setVal={setConfirmPassword}
                placeholder='Re-enter password'
              />
            </div>
            {/* Consent applies to account creation by any method (email or
                Google) — placed by the primary CTA. */}
            <p className='terms-consent'>
              By creating an account, you agree to our{' '}
              <Link to='/terms' className='terms-consent-link'>
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to='/privacy' className='terms-consent-link'>
                Privacy Policy
              </Link>
              .
            </p>
            <button className='form-action-btn btn' disabled={loading}>
              {loading ? (
                <TailSpin
                  height='28'
                  width='28'
                  color='white'
                  ariaLabel='loading'
                />
              ) : (
                'Create account'
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
            <GoogleColorIcon className='icon' /> Sign up with Google
          </button>
          <p className='switch-prompt'>
            Already have an account?{' '}
            <Link to='/login' className='prompt-btn'>
              Log in
            </Link>
          </p>
        </div>
      </main>
    </>
  )
}

export default Signup
