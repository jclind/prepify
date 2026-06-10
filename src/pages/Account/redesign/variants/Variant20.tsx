import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiSearch, FiEdit3, FiPlus, FiCommand } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant20.scss'

// V20 — Power Cook (creative). A dark, dense, keyboard-first console for the
// serious cook: a command/search bar with quick actions, compact stats, and a
// tight results grid. The "pro mode" of the account page.
const Variant20: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const [q, setQ] = useState('')
  const edit = useEditProfile()
  const p = mockProfile
  const filtered = mockRecipes.filter(r => r.title.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className='av20'>
      <div className='av20-wrap'>
        <header className='av20-head'>
          <div className='av20-id'>
            <img src={p.avatar} alt='' />
            <div>
              <h1>{p.displayName}</h1>
              <span>@{p.username} · {p.stats.made} cooked · {dollars(p.stats.moneySaved * 100)} saved</span>
            </div>
          </div>
          <button className='av20-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
        </header>

        <div className='av20-cmd'>
          <FiSearch className='av20-cmd-ico' />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder='Search your kitchen…' />
          <span className='av20-kbd'><FiCommand /> K</span>
          <div className='av20-quick'>
            <button><FiPlus /> New recipe</button>
            <button>Import</button>
          </div>
        </div>

        <div className='av20-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av20-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
          <select className='av20-sort'><option>Recently saved</option><option>Top rated</option><option>Cheapest</option><option>Quickest</option></select>
        </div>

        {tab === 'saved' ? (
          <div className='av20-grid'>
            {filtered.map(r => (
              <a key={r.id} className='av20-card' href='#saved'>
                <div className='av20-thumb'><img src={r.image} alt={r.title} /></div>
                <div className='av20-body'>
                  <h3>{r.title}</h3>
                  <div className='av20-meta'>
                    <span><CgTimer /> {r.totalTime}m</span>
                    <span><Stars rating={r.rating} size={11} /> {r.rating}</span>
                    <span className='av20-cost'>{dollars(r.servingPrice)}</span>
                    <span className='av20-tag'>{r.cuisine}</span>
                  </div>
                </div>
              </a>
            ))}
            {filtered.length === 0 && <p className='av20-empty'>No matches for “{q}”.</p>}
          </div>
        ) : (
          <div className='av20-other'><OtherTab tab={tab} /></div>
        )}
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant20
