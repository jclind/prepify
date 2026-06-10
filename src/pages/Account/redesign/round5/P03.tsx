import React, { FC, useState } from 'react'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { XpCard, EditButton, SettingsButton, ShareButton } from '../round4/shared4'
import './round5.scss'

// P3 — Slim cover band. A short warm header band anchors the avatar + name +
// controls horizontally; meta, bio and the XP card sit just beneath it. The
// band gives the page a horizontal anchor instead of a tall centered stack.
const P03: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r5 p3'>
      <div className='p3-cover'>
        <div className='p3-cover-inner'>
          <div className='p3-coverleft'>
            <img src={p.avatar} alt='' className='p3-avatar' />
            <h1 className='r5-name'>{p.displayName}</h1>
          </div>
          <div className='p3-controls'>
            <EditButton onClick={() => edit.setOpen(true)} />
            <SettingsButton />
            <ShareButton />
          </div>
        </div>
      </div>

      <div className='r5-wrap'>
        <p className='r5-meta p3-meta'>@{p.username} · {p.location} · Since {p.memberSince}</p>
        <p className='r5-bio p3-bio'>{p.bio}</p>

        <XpCard className='p3-xp' />

        <div className='p3-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default P03
