import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { SoftPills, StatTiles, R2Content } from './shared2'
import './r02.scss'

// R2 — Soft Pills. Closest to your favourite V9: the soft, friendly identity +
// stat tiles + V9 pill tabs, now with V20 search and V19 cards.
const R02: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r2v'>
      <div className='r2v-wrap'>
        <header className='r2v-head'>
          <div className='r2v-ring'><img src={p.avatar} alt='' /></div>
          <h1>{p.displayName}</h1>
          <p className='r2v-bio'>{p.bio}</p>
          <div className='r2v-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <button className='r2v-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <StatTiles />

        <div className='r2v-tabs'><SoftPills tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R02
