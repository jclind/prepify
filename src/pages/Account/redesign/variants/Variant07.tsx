import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiGrid, FiList } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant07.scss'

// V7 — Compact Toolbar. A tight, app-like header with a sticky tab toolbar and
// a grid/list view toggle. Efficient and information-dense for power browsing.
const Variant07: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av7'>
      <header className='av7-head'>
        <div className='av7-head-inner'>
          <img src={p.avatar} alt='' className='av7-avatar' />
          <div className='av7-id'>
            <h1>{p.displayName}</h1>
            <span>@{p.username}</span>
          </div>
          <div className='av7-inline-stats'>
            {accountTabs.map(t => (
              <div key={t.key} className='av7-istat'>
                <strong>{t.count}</strong><span>{t.label}</span>
              </div>
            ))}
          </div>
          <button className='av7-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
        </div>
      </header>

      <div className='av7-toolbar'>
        <div role='navigation' className='av7-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av7-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>
        <div className='av7-toolbar-right'>
          <select className='av7-sort'><option>Recent</option><option>Top rated</option><option>Quickest</option></select>
          <div className='av7-view'>
            <button className={view === 'grid' ? 'on' : ''} onClick={() => setView('grid')} aria-label='Grid view'><FiGrid /></button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label='List view'><FiList /></button>
          </div>
        </div>
      </div>

      <div className='av7-body'>
        {tab === 'saved' ? (
          <div className={view === 'grid' ? 'av7-grid' : 'av7-listview'}>
            {mockRecipes.map(r => (
              <a key={r.id} className='av7-card' href='#saved'>
                <div className='av7-thumb'><img src={r.image} alt={r.title} /></div>
                <div className='av7-card-body'>
                  <h3>{r.title}</h3>
                  <div className='av7-meta'>
                    <span><CgTimer /> {r.totalTime}m</span>
                    <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
                    <span className='av7-cost'>{dollars(r.servingPrice)}/serv</span>
                    <span className='av7-cuisine'>{r.cuisine}</span>
                  </div>
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

export default Variant07
