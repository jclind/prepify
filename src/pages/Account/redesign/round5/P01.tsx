import React, { FC, useState } from 'react'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { XpCard, EditButton, SettingsButton, ShareButton } from '../round4/shared4'
import './round5.scss'

// P1 — Left identity + top-right controls. Same Q4 content, restructured: the
// identity is one left-aligned block, the controls float to the top-right, and
// meta collapses to a single muted line. Recipes sit much higher.
const P01: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r5 p1'>
      <div className='r5-wrap'>
        <header className='p1-head'>
          <div className='p1-id'>
            <img src={p.avatar} alt='' className='p1-avatar' />
            <div className='p1-idtext'>
              <h1 className='r5-name'>{p.displayName}</h1>
              <p className='r5-meta'>@{p.username} · {p.location} · Since {p.memberSince}</p>
              <p className='r5-bio'>{p.bio}</p>
            </div>
          </div>
          <div className='p1-controls'>
            <EditButton onClick={() => edit.setOpen(true)} />
            <SettingsButton />
            <ShareButton />
          </div>
        </header>

        <XpCard className='p1-xp' />

        <div className='p1-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default P01
