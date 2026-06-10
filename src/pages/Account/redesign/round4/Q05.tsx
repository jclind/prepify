import React, { FC, useState } from 'react'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, XpBar } from '../round3/shared3'
import { EditButton, SettingsButton, ShareButton, MoreButton, RewardsButton } from './shared4'

// Q5 — Momentum + share-forward (the "interesting" take). The XP row adds a
// "+120 XP this week" momentum chip for a sense of progress, Share gets a visible
// label (sharing a cook's profile is worth nudging), and secondary actions tuck
// behind a "⋯ More" overflow so the row stays clean.
const Q05: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page q5'>
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
            <span className='r4-week'>+120 XP this week</span>
            <RewardsButton flavour='pill' />
          </div>
          <div className='r4-actions'>
            <EditButton onClick={() => edit.setOpen(true)} />
            <ShareButton label />
            <SettingsButton />
            <MoreButton />
          </div>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default Q05
