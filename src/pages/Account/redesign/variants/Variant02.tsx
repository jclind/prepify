import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiSettings } from 'react-icons/fi'
import { BsBookmarkHeart, BsStar, BsBook, BsFileEarmarkText } from 'react-icons/bs'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant02.scss'

const icons: Record<StatTab['key'], React.ReactNode> = {
  saved: <BsBookmarkHeart />,
  ratings: <BsStar />,
  recipes: <BsBook />,
  drafts: <BsFileEarmarkText />,
}

// V2 — Sidebar Dashboard. A left nav rail (profile + icon nav with counts)
// drives a content pane on the right. Reads like a focused SaaS dashboard;
// collapses to a top row on mobile.
const Variant02: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av2'>
      <div className='av2-wrap'>
        <aside className='av2-rail'>
          <div className='av2-profile'>
            <img src={p.avatar} alt='' className='av2-avatar' />
            <h1 className='av2-name'>{p.displayName}</h1>
            <span className='av2-handle'>@{p.username}</span>
            <button className='av2-edit' onClick={() => edit.setOpen(true)}>
              <FiEdit3 /> Edit profile
            </button>
          </div>
          <div role='navigation' className='av2-nav'>
            {accountTabs.map(t => (
              <button
                key={t.key}
                className={`av2-navitem ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <span className='av2-ico'>{icons[t.key]}</span>
                <span className='av2-label'>{t.label}</span>
                <span className='av2-count'>{t.count}</span>
              </button>
            ))}
          </div>
          <button className='av2-settings'><FiSettings /> Account settings</button>
        </aside>

        <main className='av2-main'>
          {tab === 'saved' ? (
            <>
              <header className='av2-mainhead'>
                <div>
                  <h2>Saved recipes</h2>
                  <p>{p.stats.saved} recipes you’ve bookmarked to cook later</p>
                </div>
                <select className='av2-sort'>
                  <option>Recently saved</option>
                  <option>Highest rated</option>
                  <option>Quickest first</option>
                </select>
              </header>
              <div className='av2-grid'>
                {mockRecipes.map(r => (
                  <a key={r.id} className='av2-card' href='#saved'>
                    <div className='av2-thumb'><img src={r.image} alt={r.title} /></div>
                    <div className='av2-body'>
                      <h3>{r.title}</h3>
                      <div className='av2-meta'>
                        <span><CgTimer /> {r.totalTime}m</span>
                        <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
                        <span className='av2-cost'>{dollars(r.servingPrice)}</span>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <>
              <header className='av2-mainhead'>
                <div><h2>{accountTabs.find(t => t.key === tab)?.label}</h2></div>
              </header>
              <OtherTab tab={tab} />
            </>
          )}
        </main>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant02
