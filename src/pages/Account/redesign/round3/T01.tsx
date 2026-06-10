import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { XpRingAvatar, LevelChip } from './shared3'
import './t01.scss'

// T1 — XP Ring. The R1 blend, slimmed: smaller avatar, no stat tiles (counts
// live in the segmented nav). The level is baked into the avatar's progress ring
// + a small rank chip — gamification you barely notice until you look.
const T01: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page t1'>
      <div className='r3soft-wrap'>
        <header className='r3soft-head'>
          <XpRingAvatar size={84} />
          <h1 className='r3soft-name'>{p.displayName}</h1>
          <div className='t1-rank'><LevelChip /></div>
          <p className='r3soft-bio'>{p.bio}</p>
          <div className='r3soft-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
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

export default T01
