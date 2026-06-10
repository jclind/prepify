import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiCheck, FiX } from 'react-icons/fi'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, OtherTab } from '../shared'
import './variant08.scss'

// V8 — Two-Column Profile. A sticky left profile rail (bio, stats) alongside a
// scrolling tabbed content column. Editing happens truly inline: the rail
// flips its name/bio into fields in place — no modal.
const Variant08: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(mockProfile.displayName)
  const [bio, setBio] = useState(mockProfile.bio)
  const p = mockProfile

  return (
    <div className='av8'>
      <div className='av8-wrap'>
        <aside className='av8-rail'>
          <img src={p.avatar} alt='' className='av8-avatar' />
          {editing ? (
            <div className='av8-editform'>
              <input className='av8-input' value={name} onChange={e => setName(e.target.value)} />
              <textarea className='av8-textarea' rows={4} value={bio} onChange={e => setBio(e.target.value)} />
              <div className='av8-editactions'>
                <button className='av8-save' onClick={() => setEditing(false)}><FiCheck /> Save</button>
                <button className='av8-cancel' onClick={() => setEditing(false)}><FiX /> Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className='av8-name'>{name}</h1>
              <span className='av8-handle'>@{p.username}</span>
              <p className='av8-loc'><HiOutlineLocationMarker /> {p.location} · Joined {p.memberSince}</p>
              <p className='av8-bio'>{bio}</p>
              <button className='av8-edit' onClick={() => setEditing(true)}><FiEdit3 /> Edit profile</button>
            </>
          )}
          <div className='av8-stats'>
            {accountTabs.map(t => (
              <button key={t.key} className={`av8-stat ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                <strong>{t.count}</strong><span>{t.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className='av8-main'>
          <div role='navigation' className='av8-tabs'>
            {accountTabs.map(t => (
              <button key={t.key} className={`av8-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'saved' ? (
            <div className='av8-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av8-card' href='#saved'>
                  <div className='av8-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}</span></div>
                  <div className='av8-body'>
                    <h3>{r.title}</h3>
                    <div className='av8-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <OtherTab tab={tab} />
          )}
        </main>
      </div>
    </div>
  )
}

export default Variant08
