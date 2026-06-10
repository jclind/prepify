import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { BsBookmarkHeart, BsStarHalf, BsBook, BsFileEarmarkText } from 'react-icons/bs'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant06.scss'

const icons: Record<StatTab['key'], React.ReactNode> = {
  saved: <BsBookmarkHeart />,
  ratings: <BsStarHalf />,
  recipes: <BsBook />,
  drafts: <BsFileEarmarkText />,
}

// V6 — Stat-Forward. The four counts are the hero: large interactive stat tiles
// that double as the primary navigation. Numbers-first for an at-a-glance feel.
const Variant06: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av6'>
      <div className='av6-wrap'>
        <header className='av6-head'>
          <div className='av6-id'>
            <img src={p.avatar} alt='' />
            <div>
              <h1>{p.displayName}</h1>
              <span>@{p.username} · {p.location}</span>
            </div>
          </div>
          <button className='av6-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='av6-tiles'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av6-tile ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <span className='av6-tile-ico'>{icons[t.key]}</span>
              <strong>{t.count}</strong>
              <span className='av6-tile-label'>{t.label}</span>
            </button>
          ))}
        </div>

        <div className='av6-content'>
          <h2 className='av6-h2'>{accountTabs.find(t => t.key === tab)?.label}</h2>
          {tab === 'saved' ? (
            <div className='av6-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av6-card' href='#saved'>
                  <div className='av6-thumb'>
                    <img src={r.image} alt={r.title} />
                    <span className='av6-badge'>{dollars(r.servingPrice)}/serv</span>
                  </div>
                  <div className='av6-body'>
                    <h3>{r.title}</h3>
                    <div className='av6-meta'>
                      <span><CgTimer /> {r.totalTime}m</span>
                      <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
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

export default Variant06
