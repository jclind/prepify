import React, { FC, useState } from 'react'
import './SubSettings.scss'
import { useAuth } from 'src/context/AuthContext'

type InputContainerProps = {
  label: string
  val: string
  setVal: (val: string) => void
}

const InputContainer: FC<InputContainerProps> = ({ label, val, setVal }) => {
  return (
    <div className='input-container'>
      <label>{label}</label>
      <input type='text' value={val} onChange={e => setVal(e.target.value)} />
    </div>
  )
}

const Profile: FC = () => {
  const authRes = useAuth()
  console.log(authRes?.user)

  const [name, setName] = useState(authRes?.user?.displayName || '')

  return (
    <div className='settings-component'>
      <div className='input-row'>
        <InputContainer label='Name' val={name} setVal={setName} />
      </div>
    </div>
  )
}

export default Profile
