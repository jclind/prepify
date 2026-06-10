import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { BsStars } from 'react-icons/bs'
import { accountTabs, mockProfile, mockRecipes, mockTasteCuisines, mockTasteDiets, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant15.scss'

// V15 — Taste Insights (creative). Surfaces what your saves say about you: top
// cuisines and diets as charts, a flavor summary, and a "made for you"
// recommendation strip — then the saved grid.
const Variant15: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av15'>
      <div className='av15-wrap'>
        <header className='av15-head'>
          <img src={p.avatar} alt='' className='av15-avatar' />
          <div className='av15-id'>
            <h1>{p.displayName}</h1>
            <span>@{p.username} · Your taste, learned from {p.stats.saved} saves</span>
          </div>
          <button className='av15-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='av15-insights'>
          <div className='av15-panel'>
            <h3>Top cuisines</h3>
            {mockTasteCuisines.map(c => (
              <div key={c.label} className='av15-row'>
                <span className='av15-row-label'>{c.label}</span>
                <div className='av15-track'><div className='av15-fill' style={{ width: `${c.pct}%`, background: c.accent }} /></div>
                <span className='av15-row-pct'>{c.pct}%</span>
              </div>
            ))}
          </div>
          <div className='av15-panel'>
            <h3>Diet leanings</h3>
            {mockTasteDiets.map(c => (
              <div key={c.label} className='av15-row'>
                <span className='av15-row-label'>{c.label}</span>
                <div className='av15-track'><div className='av15-fill' style={{ width: `${c.pct}%`, background: c.accent }} /></div>
                <span className='av15-row-pct'>{c.pct}%</span>
              </div>
            ))}
          </div>
          <div className='av15-panel av15-summary'>
            <BsStars className='av15-summary-ico' />
            <h3>Your flavor profile</h3>
            <p>You lean <strong>Italian comfort</strong> with a <strong>high-protein</strong> streak. You love meals under 30 minutes and rarely save desserts.</p>
            <div className='av15-tags'>
              <span>Saucy</span><span>Weeknight-fast</span><span>Veg-friendly</span><span>Budget-savvy</span>
            </div>
          </div>
        </div>

        <section className='av15-rec'>
          <div className='av15-rec-head'><h2><BsStars /> Made for your taste</h2><a href='#more'>Refresh</a></div>
          <div className='av15-rec-strip'>
            {mockRecipes.slice(4, 9).map(r => (
              <a key={r.id} className='av15-rec-card' href='#rec'>
                <img src={r.image} alt={r.title} />
                <div className='av15-rec-body'><h4>{r.title}</h4><span>{r.cuisine} · {r.totalTime}m</span></div>
              </a>
            ))}
          </div>
        </section>

        <div role='navigation' className='av15-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av15-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <div className='av15-grid'>
            {mockRecipes.map(r => (
              <a key={r.id} className='av15-card' href='#saved'>
                <div className='av15-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}</span></div>
                <div className='av15-cbody'><h3>{r.title}</h3><div className='av15-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div></div>
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

export default Variant15
