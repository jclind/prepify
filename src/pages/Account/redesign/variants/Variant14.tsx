import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockAchievements, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant14.scss'

// V14 — Achievements (creative). A gamified profile: a level/XP banner, a badge
// wall of earned + in-progress milestones, and the saved grid. Makes cooking
// progress feel rewarding.
const Variant14: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  const earned = mockAchievements.filter(a => a.earned).length

  return (
    <div className='av14'>
      <div className='av14-wrap'>
        <header className='av14-hero'>
          <div className='av14-avatar-wrap'>
            <img src={p.avatar} alt='' />
            <span className='av14-level'>Lv 7</span>
          </div>
          <div className='av14-id'>
            <h1>{p.displayName}</h1>
            <span className='av14-rank'>🔥 Seasoned Cook · {earned}/{mockAchievements.length} badges earned</span>
            <div className='av14-xp'>
              <div className='av14-xp-bar' style={{ width: '64%' }} />
              <span className='av14-xp-label'>1,280 / 2,000 XP to Level 8</span>
            </div>
          </div>
          <button className='av14-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <section className='av14-badges'>
          {mockAchievements.map(a => (
            <div key={a.id} className={`av14-badge ${a.earned ? 'earned' : 'locked'}`}>
              <div className='av14-badge-ico'>{a.icon}</div>
              <strong>{a.name}</strong>
              <span>{a.desc}</span>
              {!a.earned && a.progress != null && (
                <div className='av14-badge-prog'>
                  <div style={{ width: `${a.progress}%` }} />
                  <em>{a.progress}%</em>
                </div>
              )}
              {a.earned && <span className='av14-earned-tag'>Earned</span>}
            </div>
          ))}
        </section>

        <div role='navigation' className='av14-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av14-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <div className='av14-grid'>
            {mockRecipes.map(r => (
              <a key={r.id} className='av14-card' href='#saved'>
                <div className='av14-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}</span></div>
                <div className='av14-body'>
                  <h3>{r.title}</h3>
                  <div className='av14-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div>
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

export default Variant14
