import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { XpRingAvatar, LevelChip, BadgesInline, NextHint } from './shared3'
import './t05.scss'

// T5 — Quiet status line. Level in the avatar ring, plus a single slim status
// strip (rank · earned badges · next-up) sitting between the identity and the
// tabs. Everything experience-related lives in one calm line you can skim past.
const T05: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page t5'>
      <div className='r3soft-wrap'>
        <header className='r3soft-head'>
          <XpRingAvatar size={84} />
          <h1 className='r3soft-name'>{p.displayName}</h1>
          <p className='r3soft-bio'>{p.bio}</p>
          <div className='r3soft-chips'>
            <span>@{p.username}</span>
            <span>📍 {p.location}</span>
            <span>🗓️ Since {p.memberSince}</span>
          </div>
          <button className='r3soft-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='t5-status'>
          <LevelChip />
          <div className='t5-status-right'>
            <BadgesInline max={3} />
            <span className='t5-sep' />
            <NextHint />
          </div>
        </div>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default T05
