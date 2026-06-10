import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { SoftPills, StatTiles, AchievementStrip, R2Content } from './shared2'
import './r08.scss'

// R8 — Pills + Achievements. The V9 pill flavour with stat tiles and the subtle
// achievements strip side by side. Friendly and rewarding without shouting.
const R08: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r8'>
      <div className='r8-wrap'>
        <header className='r8-head'>
          <div className='r8-ring'><img src={p.avatar} alt='' /></div>
          <div className='r8-id'>
            <h1>{p.displayName}</h1>
            <span className='r8-handle'>@{p.username} · 📍 {p.location} · Since {p.memberSince}</span>
            <p className='r8-bio'>{p.bio}</p>
            <button className='r8-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          </div>
        </header>

        <div className='r8-meta'>
          <StatTiles />
          <AchievementStrip />
        </div>

        <div className='r8-tabs'><SoftPills tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R08
