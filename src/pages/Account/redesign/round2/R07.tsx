import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, StatTiles, R2Content } from './shared2'
import './r07.scss'

// R7 — Search-First. For the heavy saver: a compact identity row up top, then
// the V20 search promoted into a prominent hero band over the saved grid. Stats
// stay small and inline so search/browse leads.
const R07: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r7'>
      <div className='r7-wrap'>
        <header className='r7-head'>
          <img src={p.avatar} alt='' className='r7-avatar' />
          <div className='r7-id'>
            <h1>{p.displayName}</h1>
            <span>@{p.username} · {p.location}</span>
          </div>
          <div className='r7-stats'><StatTiles size='sm' /></div>
          <button className='r7-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
        </header>

        {tab === 'saved' && <p className='r7-tagline'>What are you cooking tonight, {p.displayName.split(' ')[0]}?</p>}

        <div className='r7-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R07
