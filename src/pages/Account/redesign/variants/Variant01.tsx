import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { BsBookmarkHeartFill } from 'react-icons/bs'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant01.scss'

// V1 — Classic Clean. Centered identity, pill tabs with counts, tidy recipe
// grid. The dependable best-practice baseline every other design is measured
// against.
const Variant01: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av1'>
      <div className='av1-wrap'>
        <header className='av1-head'>
          <img src={p.avatar} alt='' className='av1-avatar' />
          <h1 className='av1-name'>{p.displayName}</h1>
          <p className='av1-handle'>@{p.username} · Member since {p.memberSince}</p>
          <p className='av1-bio'>{p.bio}</p>
          <button className='av1-edit' onClick={() => edit.setOpen(true)}>
            <FiEdit3 /> Edit profile
          </button>
          <div className='av1-stats'>
            {accountTabs.map(t => (
              <button
                key={t.key}
                className={`av1-stat ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <strong>{t.count}</strong>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </header>

        <div role='navigation' className='av1-tabs'>
          {accountTabs.map(t => (
            <button
              key={t.key}
              className={`av1-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label} <span className='av1-tab-count'>{t.count}</span>
            </button>
          ))}
        </div>

        <div className='av1-content'>
          {tab === 'saved' ? (
            <>
              <div className='av1-toolbar'>
                <h2><BsBookmarkHeartFill /> Saved recipes</h2>
                <select className='av1-sort'>
                  <option>Recently saved</option>
                  <option>Oldest saved</option>
                  <option>Highest rated</option>
                </select>
              </div>
              <div className='av1-grid'>
                {mockRecipes.map(r => (
                  <a key={r.id} className='av1-card' href='#saved'>
                    <div className='av1-thumb'>
                      <img src={r.image} alt={r.title} />
                      <span className='av1-price'>{dollars(r.servingPrice)}/serving</span>
                    </div>
                    <div className='av1-card-body'>
                      <h3>{r.title}</h3>
                      <div className='av1-meta'>
                        <span><CgTimer /> {r.totalTime} min</span>
                        <span className='av1-rate'><Stars rating={r.rating} size={13} /> {r.rating}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <button className='av1-more'>Load more recipes</button>
            </>
          ) : (
            <OtherTab tab={tab} />
          )}
        </div>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant01
