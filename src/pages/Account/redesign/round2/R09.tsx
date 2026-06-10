import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { HiOutlineLocationMarker, HiOutlineCalendar } from 'react-icons/hi'
import { accountTabs, mockProfile, StatTab } from '../mockData'
import { useEditProfile } from '../shared'
import { Segmented, R2Content } from './shared2'
import './r09.scss'

// R9 — Bio + Stats Cards. Splits the header into a dedicated "About" card (the
// bio you wanted, given real room) beside a stats card, then the segmented
// control. Reads as a tidy two-card profile masthead.
const R09: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  return (
    <div className='r9'>
      <div className='r9-wrap'>
        <header className='r9-head'>
          <section className='r9-about'>
            <div className='r9-about-top'>
              <div className='r9-ring'><img src={p.avatar} alt='' /></div>
              <div>
                <h1>{p.displayName}</h1>
                <span className='r9-handle'>@{p.username}</span>
                <div className='r9-facts'>
                  <span><HiOutlineLocationMarker /> {p.location}</span>
                  <span><HiOutlineCalendar /> Since {p.memberSince}</span>
                </div>
              </div>
              <button className='r9-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
            </div>
            <p className='r9-bio'>{p.bio}</p>
          </section>

          <section className='r9-statcard'>
            <h2>At a glance</h2>
            <div className='r9-statgrid'>
              {accountTabs.map(t => (
                <div key={t.key} className='r9-stat'><strong>{t.count}</strong><span>{t.label}</span></div>
              ))}
              <div className='r9-stat r9-accent'><strong>{p.stats.made}</strong><span>Cooked</span></div>
              <div className='r9-stat r9-accent'><strong>${p.stats.moneySaved}</strong><span>Saved</span></div>
            </div>
          </section>
        </header>

        <div className='r9-tabs'><Segmented tab={tab} setTab={setTab} /></div>

        <R2Content tab={tab} />
      </div>
      {edit.panel}
    </div>
  )
}

export default R09
