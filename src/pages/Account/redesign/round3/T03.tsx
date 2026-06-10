import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from '../round2/shared2'
import { XpRingAvatar, BadgesInline } from './shared3'
import './t03.scss'

// T3 — Earned badges row. Level lives in the avatar ring; a tidy little row of
// earned badge glyphs (no labels) + a "+N" sits under the identity. Shows
// achievements exist and invites a click, without a wall of cards.
const T03: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3soft-page t3'>
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
          <div className='t3-row'>
            <BadgesInline />
            <button className='r3soft-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          </div>
        </header>

        <div className='r3soft-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default T03
