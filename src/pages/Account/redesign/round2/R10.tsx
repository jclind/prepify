import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, AchievementStrip, R2Content } from './shared2'
import './r10.scss'

// R10 — The Full Blend. Every liked ingredient, arranged to still feel calm:
// soft gradient-ring identity + bio, stat tiles, a subtle achievements strip,
// the segmented control, and V20 search over V19 cards.
const R10: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r10'>
      <div className='r10-wrap'>
        <header className='r10-head'>
          <div className='r10-ring'><img src={p.avatar} alt='' /></div>
          <h1>{p.displayName}</h1>
          <p className='r10-bio'>{p.bio}</p>
          <div className='r10-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <button className='r10-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <StatTiles />
        <div className='r10-ach'><AchievementStrip /></div>

        <div className='r10-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R10
