import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant10.scss'

// V10 — Segmented Control. A clean centered header over an iOS-style segmented
// switch with a sliding indicator. Modern, native-app clarity.
const Variant10: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  const activeIndex = accountTabs.findIndex(t => t.key === tab)

  return (
    <div className='av10'>
      <div className='av10-wrap'>
        <header className='av10-head'>
          <img src={p.avatar} alt='' className='av10-avatar' />
          <h1>{p.displayName}</h1>
          <p className='av10-sub'>@{p.username} · {p.stats.saved + p.stats.recipes} recipes in your kitchen</p>
          <button className='av10-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='av10-segment' style={{ ['--seg-i' as string]: activeIndex, ['--seg-n' as string]: accountTabs.length }}>
          <div className='av10-seg-indicator' />
          {accountTabs.map(t => (
            <button key={t.key} className={`av10-seg ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        <div className='av10-content'>
          {tab === 'saved' ? (
            <div className='av10-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av10-card' href='#saved'>
                  <div className='av10-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}/serv</span></div>
                  <div className='av10-body'>
                    <h3>{r.title}</h3>
                    <div className='av10-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div>
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

export default Variant10
