import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, AchievementStrip, R2Content } from './shared2'
import './r04.scss'

// R4 — Soft + Subtle Achievements. The soft identity with stat tiles, plus a
// low-key achievements strip (earned badges + progress to next) — present but
// not the focus, per your note. A toast on unlock is planned for later.
const R04: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r4'>
      <div className='r4-wrap'>
        <header className='r4-head'>
          <div className='r4-ring'><img src={p.avatar} alt='' /></div>
          <h1>{p.displayName}</h1>
          <p className='r4-bio'>{p.bio}</p>
          <span className='r4-handle'>@{p.username} · 📍 {p.location} · Since {p.memberSince}</span>
          <button className='r4-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='r4-meta-row'>
          <StatTiles />
          <AchievementStrip />
        </div>

        <div className='r4-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R04
