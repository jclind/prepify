import React, { FC, useState } from 'react'
import { FiEdit3 } from 'react-icons/fi'
import { CgTimer } from 'react-icons/cg'
import { BsBookmarkHeart, BsStar, BsBook, BsFire, BsAward } from 'react-icons/bs'
import { accountTabs, mockActivity, mockProfile, mockRecipes, MockActivity, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant18.scss'

const actIcon: Record<MockActivity['type'], React.ReactNode> = {
  saved: <BsBookmarkHeart />,
  reviewed: <BsStar />,
  published: <BsBook />,
  made: <BsFire />,
  badge: <BsAward />,
}

// V18 — Activity Timeline (creative). A chronological feed of everything you've
// done — saved, cooked, reviewed, published, badges earned — beside a compact
// profile rail. Social and alive.
const Variant18: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av18'>
      <div className='av18-wrap'>
        <aside className='av18-rail'>
          <img src={p.avatar} alt='' className='av18-avatar' />
          <h1>{p.displayName}</h1>
          <span className='av18-handle'>@{p.username}</span>
          <button className='av18-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
          <div className='av18-stats'>
            {accountTabs.map(t => (
              <button key={t.key} className={`av18-stat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <span>{t.label}</span><strong>{t.count}</strong>
              </button>
            ))}
          </div>
        </aside>

        <main className='av18-main'>
          {tab === 'saved' ? (
            <>
              <h2 className='av18-h2'>Recent activity</h2>
              <ol className='av18-feed'>
                {mockActivity.map(a => (
                  <li key={a.id} className={`av18-item av18-${a.type}`}>
                    <span className='av18-dot'>{actIcon[a.type]}</span>
                    <div className='av18-card'>
                      <div className='av18-line'>
                        <span className='av18-verb'>{a.text}</span> <strong>{a.detail}</strong>
                        <span className='av18-date'>{a.date}</span>
                      </div>
                      {a.image && <img src={a.image} alt='' className='av18-thumb' />}
                    </div>
                  </li>
                ))}
              </ol>

              <h2 className='av18-h2' style={{ marginTop: '2rem' }}>Saved recipes</h2>
              <div className='av18-grid'>
                {mockRecipes.slice(0, 6).map(r => (
                  <a key={r.id} className='av18-rcard' href='#saved'>
                    <img src={r.image} alt={r.title} />
                    <div className='av18-rbody'>
                      <h3>{r.title}</h3>
                      <div className='av18-rmeta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={11} /> {r.rating}</span><span className='av18-cost'>{dollars(r.servingPrice)}</span></div>
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className='av18-h2'>{accountTabs.find(t => t.key === tab)?.label}</h2>
              <OtherTab tab={tab} />
            </>
          )}
        </main>
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant18
