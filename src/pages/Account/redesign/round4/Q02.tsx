import React, { FC, useState } from 'react'
import { FiEdit3, FiSettings, FiShare2 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, XpBar } from '../round3/shared3'
import { RewardsButton, onSettings, onShare } from './shared4'

// Q2 — Segmented actions. Edit / Settings / Share live in one connected
// segmented control (tidy, low-emphasis), and the XP bar gets a quiet
// "View rewards ›" text link.
const Q02: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page q2'>
      <div className='r3soft-wrap'>
        <header className='r3soft-head'>
          <img src={p.avatar} alt='' className='r3soft-avatar' />
          <div className='r4-nameline'>
            <h1 className='r3soft-name'>{p.displayName}</h1>
            <LevelChip />
          </div>
          <p className='r3soft-bio'>{p.bio}</p>
          <div className='r3soft-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <div className='r4-xprow'>
            <XpBar />
            <RewardsButton flavour='link' />
          </div>
          <div className='r4-actions'>
            <div className='r4-actions-seg'>
              <button className='r4-btn' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
              <button className='r4-btn' onClick={onSettings}><FiSettings /> Settings</button>
              <button className='r4-btn' onClick={onShare}><FiShare2 /> Share</button>
            </div>
          </div>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default Q02
