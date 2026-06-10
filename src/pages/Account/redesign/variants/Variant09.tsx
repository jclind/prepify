import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant09.scss'

// V9 — Soft & Rounded. Friendly and approachable: big rounded avatar, pill
// everything, warm pastel chips and gentle shadows. The cozy, welcoming take.
const Variant09: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av9'>
      <div className='av9-wrap'>
        <header className='av9-head'>
          <div className='av9-avatar-ring'>
            <img src={p.avatar} alt='' />
          </div>
          <h1 className='av9-name'>{p.displayName}</h1>
          <p className='av9-bio'>{p.bio}</p>
          <div className='av9-chips'>
            <span className='av9-chip'>@{p.username}</span>
            <span className='av9-chip'>📍 {p.location}</span>
            <span className='av9-chip'>🗓️ Since {p.memberSince}</span>
          </div>
          <button className='av9-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div role='navigation' className='av9-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av9-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <em>{t.count}</em>
            </button>
          ))}
        </div>

        <div className='av9-content'>
          {tab === 'saved' ? (
            <div className='av9-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av9-card' href='#saved'>
                  <div className='av9-thumb'><img src={r.image} alt={r.title} /></div>
                  <div className='av9-body'>
                    <h3>{r.title}</h3>
                    <div className='av9-meta'>
                      <span className='av9-pill'><CgTimer /> {r.totalTime}m</span>
                      <span className='av9-pill'><Stars rating={r.rating} size={11} /> {r.rating}</span>
                      <span className='av9-pill av9-pill-cost'>{dollars(r.servingPrice)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <OtherTab tab={tab} />
          )}
        </div>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant09
