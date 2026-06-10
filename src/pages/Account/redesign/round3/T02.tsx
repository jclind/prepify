import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, XpBar } from './shared3'
import './t02.scss'

// T2 — Level + XP bar. A rank chip sits next to the name and a slim XP-to-next
// bar tucks under the chips. Communicates "experience/progress" in two thin,
// quiet lines — no badges competing for attention.
const T02: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page t2'>
      <div className='r3soft-wrap'>
        <header className='r3soft-head'>
          <img src={p.avatar} alt='' className='r3soft-avatar' />
          <div className='t2-nameline'>
            <h1 className='r3soft-name'>{p.displayName}</h1>
            <LevelChip />
          </div>
          <p className='r3soft-bio'>{p.bio}</p>
          <div className='r3soft-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <div className='t2-xp'><XpBar /></div>
          <button className='r3soft-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default T02
