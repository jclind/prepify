import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiPlus, FiArrowLeft } from 'react-icons/fi'
import { accountTabs, mockCollections, mockProfile, mockRecipes, MockCollection, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant11.scss'

// V11 — Collections Board (creative). Saved recipes live in named, cover-collage
// collections (Weeknight, Meatless Mondays…) you tap into. Pinterest-board
// organization for a kitchen that has outgrown one flat list.
const Variant11: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const [open, setOpen] = useState<MockCollection | null>(null)
  const edit = useEditProfile()
  const p = mockProfile

  return (
    <div className='av11'>
      <div className='av11-wrap'>
        <header className='av11-head'>
          <img src={p.avatar} alt='' className='av11-avatar' />
          <div className='av11-id'>
            <h1>{p.displayName}</h1>
            <span>@{p.username} · {mockCollections.length} collections · {p.stats.saved} saved</span>
          </div>
          <button className='av11-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div role='navigation' className='av11-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av11-tab ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setOpen(null) }}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab !== 'saved' ? (
          <OtherTab tab={tab} />
        ) : open ? (
          <section className='av11-detail'>
            <button className='av11-back' onClick={() => setOpen(null)}><FiArrowLeft /> All collections</button>
            <h2 style={{ ['--accent' as string]: open.accent }}>{open.name} <em>{open.count} recipes</em></h2>
            <div className='av11-recipes'>
              {mockRecipes.slice(0, 8).map(r => (
                <a key={r.id} className='av11-recipe' href='#saved'>
                  <div className='av11-rthumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}</span></div>
                  <h3>{r.title}</h3>
                  <div className='av11-rmeta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={11} /> {r.rating}</span></div>
                </a>
              ))}
            </div>
          </section>
        ) : (
          <section className='av11-boards'>
            {mockCollections.map(c => (
              <button key={c.id} className='av11-board' onClick={() => setOpen(c)} style={{ ['--accent' as string]: c.accent }}>
                <div className='av11-collage'>
                  {c.covers.map((src, i) => <img key={i} src={src} alt='' />)}
                  <span className='av11-board-count'>{c.count}</span>
                </div>
                <div className='av11-board-name'>{c.name}</div>
              </button>
            ))}
            <button className='av11-new'>
              <FiPlus />
              <span>New collection</span>
            </button>
          </section>
        )}
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant11
