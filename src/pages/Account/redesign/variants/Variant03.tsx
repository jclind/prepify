import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiCamera } from 'react-icons/fi'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant03.scss'

// V3 — Cover Banner. A cover photo with an overlapping avatar, a stat-tile row,
// and underline tabs. The familiar, tasteful social-profile pattern.
const Variant03: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av3'>
      <div className='av3-cover' style={{ backgroundImage: `url(${p.coverImage})` }}>
        <button className='av3-coverbtn'><FiCamera /> Edit cover</button>
      </div>
      <div className='av3-wrap'>
        <header className='av3-head'>
          <img src={p.avatar} alt='' className='av3-avatar' />
          <div className='av3-id'>
            <h1>{p.displayName}</h1>
            <p className='av3-handle'>
              @{p.username} <span className='av3-dot'>·</span>
              <HiOutlineLocationMarker /> {p.location} <span className='av3-dot'>·</span> Joined {p.memberSince}
            </p>
            <p className='av3-bio'>{p.bio}</p>
          </div>
          <button className='av3-edit' onClick={() => edit.setOpen(true)}>
            <FiEdit3 /> Edit profile
          </button>
        </header>

        <div className='av3-stats'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av3-stat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              <strong>{t.count}</strong>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div role='navigation' className='av3-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av3-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className='av3-content'>
          {tab === 'saved' ? (
            <div className='av3-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av3-card' href='#saved'>
                  <div className='av3-thumb'>
                    <img src={r.image} alt={r.title} />
                    <span className='av3-price'>{dollars(r.servingPrice)}/serv</span>
                  </div>
                  <div className='av3-body'>
                    <h3>{r.title}</h3>
                    <div className='av3-meta'>
                      <span><CgTimer /> {r.totalTime}m</span>
                      <span><Stars rating={r.rating} size={12} /> {r.rating} ({r.ratingCount})</span>
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

export default Variant03
