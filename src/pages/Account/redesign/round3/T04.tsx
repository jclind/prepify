import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, NextHint } from './shared3'
import './t04.scss'

// T4 — Level + next-up. A rank chip plus a single "Next: …" nudge toward the
// closest achievement, on one quiet line. Forward-looking (gives a goal) while
// staying out of the way.
const T04: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page t4'>
      <div className='r3soft-wrap'>
        <header className='r3soft-head'>
          <img src={p.avatar} alt='' className='r3soft-avatar' />
          <h1 className='r3soft-name'>{p.displayName}</h1>
          <p className='r3soft-bio'>{p.bio}</p>
          <div className='r3soft-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <div className='t4-line'>
            <LevelChip />
            <span className='t4-sep' />
            <NextHint />
          </div>
          <button className='r3soft-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default T04
