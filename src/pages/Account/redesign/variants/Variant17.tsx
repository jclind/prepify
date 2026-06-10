import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3 } from 'react-icons/fi'
import { accountTabs, mockProfile, mockRecipes, mockReviews, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant17.scss'

// V17 — Magazine Feature (creative). The account as an editorial spread: a
// masthead name, a large featured "latest save", a pull-quote from a review,
// and an editorial recipe grid. Distinctive and premium.
const Variant17: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  const feature = mockRecipes[0]
  const quote = mockReviews[0]

  return (
    <div className='av17'>
      <div className='av17-wrap'>
        <header className='av17-masthead'>
          <div className='av17-mast-left'>
            <span className='av17-issue'>The Kitchen of</span>
            <h1>{p.displayName}</h1>
            <span className='av17-byline'>@{p.username} · Est. {p.memberSince} · {p.location}</span>
          </div>
          <div className='av17-mast-right'>
            <img src={p.avatar} alt='' />
            <button className='av17-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit</button>
          </div>
        </header>

        <div className='av17-rule' />

        <section className='av17-feature'>
          <a className='av17-feature-main' href='#feature'>
            <img src={feature.image} alt={feature.title} />
            <div className='av17-feature-cap'>
              <span className='av17-kicker'>Latest save</span>
              <h2>{feature.title}</h2>
              <div className='av17-feature-meta'><CgTimer /> {feature.totalTime} min · {dollars(feature.servingPrice)}/serving · {feature.cuisine}</div>
            </div>
          </a>
          <aside className='av17-feature-side'>
            <blockquote className='av17-quote'>
              “{quote.text}”
              <cite><Stars rating={quote.rating} size={13} /> on {quote.recipeTitle}</cite>
            </blockquote>
            <div className='av17-stats'>
              {accountTabs.map(t => (
                <button key={t.key} className={`av17-stat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                  <strong>{t.count}</strong><span>{t.label}</span>
                </button>
              ))}
            </div>
          </aside>
        </section>

        <div role='navigation' className='av17-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av17-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <div className='av17-grid'>
            {mockRecipes.slice(1).map(r => (
              <a key={r.id} className='av17-card' href='#saved'>
                <div className='av17-thumb'><img src={r.image} alt={r.title} /></div>
                <span className='av17-cuisine'>{r.cuisine}</span>
                <h3>{r.title}</h3>
                <div className='av17-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={11} /> {r.rating}</span><span>{dollars(r.servingPrice)}</span></div>
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

export default Variant17
