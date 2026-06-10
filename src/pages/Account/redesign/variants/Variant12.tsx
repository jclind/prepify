import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiEdit3, FiTrendingUp } from 'react-icons/fi'
import { BsFire, BsPiggyBank, BsCheckCircle, BsBookmarkHeart } from 'react-icons/bs'
import { accountTabs, mockProfile, mockRecipes, StatTab } from '../mockData'
import { Stars, dollars, useEditProfile, OtherTab } from '../shared'
import './variant12.scss'

const week = [
  { d: 'M', v: 2 }, { d: 'T', v: 1 }, { d: 'W', v: 3 }, { d: 'T', v: 0 },
  { d: 'F', v: 2 }, { d: 'S', v: 4 }, { d: 'S', v: 3 },
]

// V12 — Cooking Dashboard (creative). Leads with the cook's stats: a streak, money
// saved vs takeout, meals made, and a weekly cooking chart, then the saved grid.
const Variant12: FC = () => {
  const [tab, setTab] = useState<StatTab['key']>('saved')
  const edit = useEditProfile()
  const p = mockProfile
  const max = Math.max(...week.map(w => w.v))

  return (
    <div className='av12'>
      <div className='av12-wrap'>
        <header className='av12-head'>
          <img src={p.avatar} alt='' className='av12-avatar' />
          <div className='av12-id'>
            <h1>Hey, {p.displayName.split(' ')[0]} 👋</h1>
            <span>You’ve cooked {p.stats.made} meals and saved {dollars(p.stats.moneySaved * 100)} so far.</span>
          </div>
          <button className='av12-edit' onClick={() => edit.setOpen(true)}><FiEdit3 /> Edit profile</button>
        </header>

        <div className='av12-metrics'>
          <div className='av12-metric av12-streak'>
            <BsFire className='av12-mico' />
            <strong>{p.stats.streak} days</strong>
            <span>Cooking streak</span>
          </div>
          <div className='av12-metric'>
            <BsPiggyBank className='av12-mico' />
            <strong>{dollars(p.stats.moneySaved * 100)}</strong>
            <span>Saved vs takeout</span>
          </div>
          <div className='av12-metric'>
            <BsCheckCircle className='av12-mico' />
            <strong>{p.stats.made}</strong>
            <span>Meals made</span>
          </div>
          <div className='av12-metric av12-chartcard'>
            <div className='av12-chart-head'><FiTrendingUp /> This week <em>12 cooks</em></div>
            <div className='av12-chart'>
              {week.map((w, i) => (
                <div key={i} className='av12-bar-col'>
                  <div className='av12-bar' style={{ height: `${(w.v / max) * 100}%` }} />
                  <span>{w.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div role='navigation' className='av12-tabs'>
          {accountTabs.map(t => (
            <button key={t.key} className={`av12-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label} <span>{t.count}</span>
            </button>
          ))}
        </div>

        {tab === 'saved' ? (
          <>
            <h2 className='av12-h2'><BsBookmarkHeart /> Saved & ready to cook</h2>
            <div className='av12-grid'>
              {mockRecipes.map(r => (
                <a key={r.id} className='av12-card' href='#saved'>
                  <div className='av12-thumb'><img src={r.image} alt={r.title} /><span>{dollars(r.servingPrice)}/serv</span></div>
                  <div className='av12-body'>
                    <h3>{r.title}</h3>
                    <div className='av12-meta'><span><CgTimer /> {r.totalTime}m</span><span><Stars rating={r.rating} size={12} /> {r.rating}</span></div>
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <OtherTab tab={tab} />
        )}
      </div>
      {edit.panel}
    </div>
  )
}

export default Variant12
