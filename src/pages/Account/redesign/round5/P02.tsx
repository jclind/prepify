import React, { FC, useState } from 'react'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { LevelChip, XpBar } from '../round3/shared3'
import { EditButton, SettingsButton, ShareButton, onRewards } from '../round4/shared4'
import './round5.scss'

// P2 — Compact two-column header. Identity on the left; a tidy right column with
// a cleaned-up level/XP card (level + Rewards on top, full-width XP bar below)
// and the controls aligned beneath it. Segmented nav is centered.
const P02: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r5 p2'>
      <div className='r5-wrap'>
        <header className='p2-head'>
          <div className='p2-id'>
            <img src={p.avatar} alt='' className='p2-avatar' />
            <div>
              <h1 className='r5-name'>{p.displayName}</h1>
              <p className='r5-meta'>@{p.username} · {p.location} · Since {p.memberSince}</p>
              <p className='r5-bio'>{p.bio}</p>
            </div>
          </div>

          <div className='p2-side'>
            <button className='p2-xpcard' onClick={onRewards}>
              <div className='p2-xptop'>
                <LevelChip />
                <span className='p2-xpcta'>Rewards <span aria-hidden>›</span></span>
              </div>
              <XpBar />
            </button>
            <div className='p2-controls'>
              <EditButton onClick={() => edit.setOpen(true)} />
              <SettingsButton />
              <ShareButton />
            </div>
          </div>
        </header>

        <div className='p2-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default P02
