import React, { FC, useState } from 'react'
import { CgTimer } from 'react-icons/cg'
import { FiSearch } from 'react-icons/fi'
import { accountTabs, mockAchievements, mockRecipes, MockRecipe, StatTab } from '../mockData'
import { Stars, dollars, OtherTab } from '../shared'
import './shared2.scss'

// Round 2 — Refined. Shared building blocks distilled from the user's favourite
// pieces of round 1, so every refined variant reuses the same liked elements:
//   • R2Card    — the recipe card from V19 (the user's favourite card)
//   • SavedSearch — the search-to-filter saved recipes from V20
//   • Segmented — the sliding segmented control from V10
//   • SoftPills — the friendly pill tabs from V9
//   • StatTiles — at-a-glance counts (V9 "stats" the user liked)
//   • AchievementStrip — achievements kept SUBTLE (vs V14's wall)
// Variants differ only in header treatment + how these are arranged.

// V19-style recipe card.
export const R2Card: FC<{ r: MockRecipe }> = ({ r }) => (
  <a className='r2-card' href='#saved'>
    <div className='r2-thumb'>
      <img src={r.image} alt={r.title} />
      <span className='r2-price'>{dollars(r.servingPrice)}/serv</span>
    </div>
    <div className='r2-body'>
      <h3>{r.title}</h3>
      <div className='r2-meta'>
        <span><CgTimer /> {r.totalTime}m</span>
        <span><Stars rating={r.rating} size={12} /> {r.rating}</span>
      </div>
    </div>
  </a>
)

// V20-style search + the V19 card grid. `cols` lets a variant set grid density.
export const SavedSearch: FC<{ cols?: number }> = ({ cols = 4 }) => {
  const [q, setQ] = useState('')
  const filtered = mockRecipes.filter(r => r.title.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className='r2-saved'>
      <div className='r2-searchbar'>
        <FiSearch className='r2-search-ico' />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder='Search your saved recipes…'
        />
        <select className='r2-sort' aria-label='Sort saved recipes'>
          <option>Recently saved</option>
          <option>Highest rated</option>
          <option>Quickest first</option>
          <option>Cheapest per serving</option>
        </select>
      </div>
      <div className={`r2-grid cols-${cols}`}>
        {filtered.map(r => <R2Card key={r.id} r={r} />)}
      </div>
      {filtered.length === 0 ? (
        <p className='r2-empty'>No saved recipes match “{q}”.</p>
      ) : (
        <button className='r2-more'>Load more recipes</button>
      )}
    </div>
  )
}

// Renders the Saved tab (search + grid) or the shared neutral tab otherwise.
export const R2Content: FC<{ tab: StatTab['key']; cols?: number }> = ({ tab, cols }) =>
  tab === 'saved' ? <SavedSearch cols={cols} /> : <OtherTab tab={tab} />

type TabProps = { tab: StatTab['key']; setTab: (k: StatTab['key']) => void }

// V10-style segmented control with a sliding indicator.
export const Segmented: FC<TabProps> = ({ tab, setTab }) => {
  const activeIndex = accountTabs.findIndex(t => t.key === tab)
  return (
    <div
      className='r2-segment'
      role='navigation'
      style={{ ['--seg-i' as string]: activeIndex, ['--seg-n' as string]: accountTabs.length }}
    >
      <div className='r2-seg-indicator' />
      {accountTabs.map(t => (
        <button key={t.key} className={`r2-seg ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
          {t.label} <span>{t.count}</span>
        </button>
      ))}
    </div>
  )
}

// V9-style friendly pill tabs.
export const SoftPills: FC<TabProps> = ({ tab, setTab }) => (
  <div className='r2-pills' role='navigation'>
    {accountTabs.map(t => (
      <button key={t.key} className={`r2-pill ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
        {t.label} <em>{t.count}</em>
      </button>
    ))}
  </div>
)

// At-a-glance stat tiles. Pass onSelect to make them double as tab shortcuts.
export const StatTiles: FC<{ active?: StatTab['key']; onSelect?: (k: StatTab['key']) => void; size?: 'sm' | 'md' }> = ({
  active,
  onSelect,
  size = 'md',
}) => (
  <div className={`r2-stats ${size}`}>
    {accountTabs.map(t => {
      const Tag = onSelect ? 'button' : 'div'
      return (
        <Tag
          key={t.key}
          className={`r2-stat ${active === t.key ? 'active' : ''}`}
          {...(onSelect ? { onClick: () => onSelect(t.key) } : {})}
        >
          <strong>{t.count}</strong>
          <span>{t.label}</span>
        </Tag>
      )
    })}
  </div>
)

// Subtle achievements: a couple of earned badges + progress to the next one.
// Intentionally low-key — the full wall lives in round-1 V14. A toast when a
// badge is unlocked is noted for a later milestone (see memory).
export const AchievementStrip: FC = () => {
  const earned = mockAchievements.filter(a => a.earned).slice(0, 4)
  const next = mockAchievements.find(a => !a.earned && a.progress != null)
  return (
    <div className='r2-ach'>
      <div className='r2-ach-earned'>
        {earned.map(a => (
          <span key={a.id} className='r2-ach-badge' title={`${a.name} — ${a.desc}`}>{a.icon}</span>
        ))}
      </div>
      {next && (
        <div className='r2-ach-next'>
          <span className='r2-ach-next-ico'>{next.icon}</span>
          <div className='r2-ach-next-body'>
            <span className='r2-ach-next-label'>Next: {next.name}</span>
            <div className='r2-ach-track'><div style={{ width: `${next.progress}%` }} /></div>
          </div>
          <span className='r2-ach-pct'>{next.progress}%</span>
        </div>
      )}
    </div>
  )
}
