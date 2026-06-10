import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiArrowUpRight } from 'react-icons/fi'
import { BsFire, BsBookmarkHeart } from 'react-icons/bs'
import { accountTabs, mockCollections, mockProfile, mockRecipes, mockReviews, mockTasteCuisines, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant19.scss'

// V19 — Bento Grid (creative). A trendy asymmetric bento of mixed tiles —
// profile, streak, a collection peek, top cuisine, a review, money saved —
// giving a rich one-glance overview, then the saved grid.
const Variant19: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  const col = mockCollections[0]
  const rv = mockReviews[0]
  const topCuisine = mockTasteCuisines[0]

  return (
    <div className='av19'>
      <div className='av19-wrap'>
        <div className='av19-bento'>
          <div className='av19-tile av19-profile'>
            <img src={p.avatar} alt='' />
            <h1>{p.displayName}</h1>
            <span>@{p.username} · since {p.memberSince}</span>
            <button className='av19-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          </div>

          <div className='av19-tile av19-streak'>
            <BsFire />
            <strong>{p.stats.streak}</strong>
            <span>day streak</span>
          </div>

          <div className='av19-tile av19-saved-num'>
            <BsBookmarkHeart />
            <strong>{p.stats.saved}</strong>
            <span>saved recipes</span>
          </div>

          <div className='av19-tile av19-money'>
            <span className='av19-money-label'>Saved vs takeout</span>
            <strong>{dollars(p.stats.moneySaved * 100)}</strong>
            <div className='av19-money-bar'><div style={{ width: '82%' }} /></div>
          </div>

          <button className='av19-tile av19-collection' style={{ backgroundImage: `url(${col.covers[0]})` }}>
            <div className='av19-collection-cap'>
              <span>Collection</span>
              <h3>{col.name}</h3>
              <em>{col.count} recipes <FiArrowUpRight /></em>
            </div>
          </button>

          <div className='av19-tile av19-cuisine'>
            <span className='av19-tile-label'>Your #1 cuisine</span>
            <strong>{topCuisine.label}</strong>
            <div className='av19-cuisine-bar'><div style={{ width: `${topCuisine.pct}%` }} /></div>
            <em>{topCuisine.pct}% of saves</em>
          </div>

          <div className='av19-tile av19-review'>
            <span className='av19-tile-label'>Your latest review</span>
            <Stars rating={rv.rating} size={14} />
            <p>“{rv.text}”</p>
            <em>on {rv.recipeTitle}</em>
          </div>
        </div>

        <div role='navigation' className='av19-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av19-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <div className='av19-grid'>
            {mockRecipes.map(r => (
              <a key={r.id} className='av19-card' href='#saved'>
                <div className='av19-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}</span></div>
                <div className='av19-body'><h3>{r.title}</h3><div className='av19-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div></div>
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

export default Variant19
