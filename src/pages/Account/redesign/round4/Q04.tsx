import React, { FC, useState } from 'react'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, XpBar } from '../round3/shared3'
import { EditButton, SettingsButton, ShareButton, onRewards } from './shared4'

// Q4 — XP card. The level chip + XP bar + rewards CTA combine into one tappable
// card, so "progress" is a single, obvious target. Actions stay subtle (outline
// Edit + Settings/Share icons).
const Q04: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page q4'>
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

          <button className='r4-xpcard' onClick={onRewards}>
            <LevelChip />
            <XpBar />
            <span className='r4-xpcard-cta'>Rewards <span aria-hidden>›</span></span>
          </button>

          <div className='r4-actions'>
            <EditButton onClick={() => edit.setOpen(true)} />
            <SettingsButton />
            <ShareButton />
          </div>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default Q04
