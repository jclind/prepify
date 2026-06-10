import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, R2Content } from './shared2'
import './r03.scss'

// R3 — Clean Segmented. The minimal take: flat canvas, restrained V10 header,
// a compact inline stat strip, bio, segmented control. The most understated.
const R03: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r3'>
      <div className='r3-wrap'>
        <header className='r3-head'>
          <img src={p.avatar} alt='' className='r3-avatar' />
          <h1>{p.displayName}</h1>
          <span className='r3-handle'>@{p.username} · {p.location} · Since {p.memberSince}</span>
          <p className='r3-bio'>{p.bio}</p>
          <button className='r3-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          <div className='r3-stats'><StatTiles size='sm' /></div>
        </header>

        <div className='r3-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R03
