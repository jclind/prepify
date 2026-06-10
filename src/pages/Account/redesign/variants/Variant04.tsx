import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant04.scss'

// V4 — Card Stack. Every region is its own clearly bounded white card on a warm
// canvas: a profile card, a stats card, and a tabbed content card. Strong
// sectioning makes the page feel organized and scannable.
const Variant04: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av4'>
      <div className='av4-wrap'>
        <section className='av4-card av4-profile'>
          <img src={p.avatar} alt='' className='av4-avatar' />
          <div className='av4-id'>
            <h1>{p.displayName}</h1>
            <span className='av4-handle'>@{p.username} · Member since {p.memberSince}</span>
            <p className='av4-bio'>{p.bio}</p>
          </div>
          <button className='av4-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
        </section>

        <section className='av4-card av4-statcard'>
          {accountTabs.map((t, i) => (
            <React.Fragment key={t.key}>
              {i > 0 && <div className='av4-divider' />}
              <button className={`av4-stat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <strong>{t.count}</strong>
                <span>{t.label}</span>
              </button>
            </React.Fragment>
          ))}
        </section>

        <section className='av4-card av4-contentcard'>
          <div role='navigation' className='av4-tabs'>
            {accountTabs.map(t => (
              <button key={t.key} className={`av4-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label} <span>{t.count}</span>
              </button>
            ))}
          </div>
          <div className='av4-content'>
            {tab === 'saved' ? (
              <div className='av4-grid'>
                {mockRecipes.map(r => (
                  <a key={r.id} className='av4-recipe' href='#saved'>
                    <img src={r.image} alt={r.title} />
                    <div className='av4-recipe-body'>
                      <h3>{r.title}</h3>
                      <div className='av4-meta'>
                        <span><CgTimer /> {r.totalTime}m</span>
                        <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
                        <span className='av4-cost'>{dollars(r.servingPrice)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <OtherTab tab={tab} />
            )}
          </div>
        </section>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant04
