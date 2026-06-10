import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, R2Content } from './shared2'
import './r01.scss'

// R1 — Soft Segmented. The headline blend you described: V9's soft centered
// identity (gradient-ring avatar, bio, chips) + V9 stat tiles + V10's segmented
// control + V20 search + V19 cards.
const R01: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r1'>
      <div className='r1-wrap'>
        <header className='r1-head'>
          <div className='r1-ring'><img src={p.avatar} alt='' /></div>
          <h1>{p.displayName}</h1>
          <p className='r1-bio'>{p.bio}</p>
          <div className='r1-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <button className='r1-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <StatTiles />

        <div className='r1-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R01
