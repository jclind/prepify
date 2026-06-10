import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from './shared2'
import './r06.scss'

// R6 — Gradient Band. A softened version of the V16 gradient idea: a warm but
// restrained header band with the bio and inline glass stats, then the segmented
// control floating just below it. Brand-forward but not loud.
const R06: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r6'>
      <div className='r6-band'>
        <div className='r6-band-inner'>
          <img src={p.avatar} alt='' className='r6-avatar' />
          <div className='r6-id'>
            <h1>{p.displayName}</h1>
            <span className='r6-handle'>@{p.username} · {p.location} · Since {p.memberSince}</span>
            <p className='r6-bio'>{p.bio}</p>
          </div>
          <button className='r6-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </div>
        <div className='r6-glass'>
          {accountTabs.map(t => (
            <div key={t.key} className='r6-gstat'><strong>{t.count}</strong><span>{t.label}</span></div>
          ))}
        </div>
      </div>

      <div className='r6-wrap'>
        <div className='r6-tabs'><Segmented tab={tab} setTab={setTab} /></div>
        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R06
