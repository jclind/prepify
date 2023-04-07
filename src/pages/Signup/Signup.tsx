import React, { ChangeEvent, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AiOutlineGoogle, AiOutlineUser } from 'react-icons/ai'
import { MdOutlineEmail, MdOutlineLock } from 'react-icons/md'
import { useAuth } from '../../context/AuthContext'
import { TailSpin } from 'react-loader-spinner'
import { Helmet } from 'react-helmet'

import UsernameInput from '../../Components/Form/UsernameInput'

import './Signup.scss'
import '../../Components/Form/FormStyles.scss'

import PrepifyLogo from '../../Components/Navbar/PrepifyLogo'
import FormInput from '../../Components/Form/FormInput'

const Signup = () => {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)

  const [isUsernameAvailable, setIsUsernameAvailable] = useState<
    boolean | null
  >(null)

  const authRes = useAuth()

  const handleEmailAndPasswordFormSubmit = async (
    e: ChangeEvent<HTMLFormElement>
  ) => {
    setError('')
    setSuccess('')
    e.preventDefault()

    authRes?.signUp(
      email,
      password,
      username,
      name,
      setLoading,
      setSuccess,
      setError
    )
  }

  return authRes?.user ? (
    <Navigate to='/' />
  ) : (
    <>
      <Helmet>
        <meta charSet='utf-8' />
        <title>Prepify | Sign Up</title>
      </Helmet>
      <div className='abs-logo'>
        <PrepifyLogo />
      </div>
      <div className='signup-page form-format'>
        <div className='form-container'>
          <form onSubmit={handleEmailAndPasswordFormSubmit} className='form'>
            <h1 className='title'>Sign Up</h1>
            <p className='prompt'>
              Already have an account?{' '}
              <Link to='/login' className='prompt-btn'>
                Login
              </Link>{' '}
            </p>
            {success ? <div className='success'>{success}</div> : null}
            {error ? <div className='error'>{error}</div> : null}
            <div className='input-fields'>
              <FormInput
                icon={<AiOutlineUser className='icon' />}
                type='text'
                name='name'
                val={name}
                setVal={setName}
                placeholder={'John Smith'}
              />
              <UsernameInput
                isUsernameAvailable={isUsernameAvailable}
                setIsUsernameAvailable={setIsUsernameAvailable}
                username={username}
                setUsername={setUsername}
                setSuccess={setSuccess}
                setError={setError}
              />
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
            </div>
            <button className='form-action-btn btn'>
              {loading ? (
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
          <button
            className='google-btn btn'
            onClick={() => authRes?.signInWithGoogle(setError)}
          >
            <AiOutlineGoogle className='icon' /> Sign Up With Google
          </button>
        </div>
      </div>
    </>
  )
}

export default Signup
