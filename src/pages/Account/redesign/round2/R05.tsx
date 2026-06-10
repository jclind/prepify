import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, R2Content } from './shared2'
import './r05.scss'

// R5 — Side Profile. The same liked ingredients in an asymmetric, left-aligned
// header: identity + bio on the left, stat tiles on the right, segmented +
// search below. A little more "dashboard" while staying soft.
const R05: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r5'>
      <div className='r5-wrap'>
        <header className='r5-head'>
          <div className='r5-id'>
            <div className='r5-ring'><img src={p.avatar} alt='' /></div>
            <div className='r5-id-text'>
              <h1>{p.displayName}</h1>
              <span className='r5-handle'>@{p.username} <span className='r5-dot'>·</span> <HiOutlineLocationMarker /> {p.location} <span className='r5-dot'>·</span> Since {p.memberSince}</span>
              <p className='r5-bio'>{p.bio}</p>
              <button className='r5-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
            </div>
          </div>
          <div className='r5-stats'><StatTiles /></div>
        </header>

        <div className='r5-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R05
