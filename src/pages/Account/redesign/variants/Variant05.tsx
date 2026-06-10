import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant05.scss'

// V5 — Minimal Editorial. Whitespace-forward, oversized display name, thin
// divider tabs, a generous airy grid. Reads like a clean magazine masthead.
const Variant05: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av5'>
      <div className='av5-wrap'>
        <header className='av5-head'>
          <div className='av5-top'>
            <span className='av5-eyebrow'>Your kitchen</span>
            <button className='av5-edit' onClick={() => edit.setOpen(true)}>Edit profile</button>
          </div>
          <h1 className='av5-name'>{p.displayName}</h1>
          <div className='av5-sub'>
            <img src={p.avatar} alt='' />
            <span>@{p.username}</span>
            <span className='av5-sep'>—</span>
            <span>{p.bio}</span>
          </div>
        </header>

        <div role='navigation' className='av5-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av5-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <span className='av5-tab-label'>{t.label}</span>
              <span className='av5-tab-count'>{t.count}</span>
            </button>
          ))}
        </div>

        <div className='av5-content'>
          {tab === 'saved' ? (
            <div className='av5-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av5-card' href='#saved'>
                  <div className='av5-thumb'><img src={r.image} alt={r.title} /></div>
                  <div className='av5-cuisine'>{r.cuisine}</div>
                  <h3>{r.title}</h3>
                  <div className='av5-meta'>
                    <span><CgTimer /> {r.totalTime} min</span>
                    <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
                    <span>{dollars(r.servingPrice)}/serving</span>
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

export default Variant05
