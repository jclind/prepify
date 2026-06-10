import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant16.scss'

// V16 — Gradient Hero (creative). A bold full-bleed gradient identity band with
// glassy stat cards floating over it, echoing the mobile-nav redesign's
// full-screen gradient language. Striking and brand-forward.
const Variant16: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av16'>
      <div className='av16-hero'>
        <div className='av16-hero-inner'>
          <img src={p.avatar} alt='' className='av16-avatar' />
          <h1>{p.displayName}</h1>
          <p className='av16-handle'>@{p.username} · {p.location}</p>
          <p className='av16-bio'>{p.bio}</p>
          <button className='av16-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          <div className='av16-glass-stats'>
            {accountTabs.map(t => (
              <button key={t.key} className={`av16-gstat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <strong>{t.count}</strong><span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='av16-wrap'>
        <div role='navigation' className='av16-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av16-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <div className='av16-grid'>
            {mockRecipes.map(r => (
              <a key={r.id} className='av16-card' href='#saved'>
                <div className='av16-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}/serv</span></div>
                <div className='av16-body'>
                  <h3>{r.title}</h3>
                  <div className='av16-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <OtherTab tab={tab} />
        )}
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant16
