import React, { FC, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BiChevronUp } from 'react-icons/bi'
import './DesignSwitcher.scss'

const original = [
  { label: 'Original', to: '/' },
]
const classicFamily = [
  { label: 'Classic+', to: '/design/home-classic' },
  { label: 'Pulse', to: '/design/home-classic-pulse' },
  { label: 'Curated', to: '/design/home-classic-curated' },
  { label: 'Mosaic', to: '/design/home-classic-mosaic' },
  { label: 'Shelves', to: '/design/home-classic-shelves' },
]
const refined = [
  { label: 'Split', to: '/design/home-split' },
  { label: 'Carousel', to: '/design/home-carousel' },
  { label: 'Stats', to: '/design/home-stats' },
  { label: 'Search', to: '/design/home-search' },
]
const rethought = [
  { label: 'Pantry', to: '/design/home-pantry' },
  { label: 'Feed', to: '/design/home-feed' },
  { label: 'Atlas', to: '/design/home-atlas' },
  { label: 'Chat', to: '/design/home-chat' },
  { label: 'Forecast', to: '/design/home-forecast' },
]
const concept = [
  { label: 'Discover', to: '/design/discover' },
  { label: 'Cook Now', to: '/design/cook' },
  { label: 'Plan Week', to: '/design/plan' },
]
const filledIn = [
  { label: 'Warm', to: '/design/v2/warm' },
  { label: 'Editorial', to: '/design/v2/editorial' },
  { label: 'Rows', to: '/design/v2/rows' },
  { label: 'Spotlight', to: '/design/v2/spotlight' },
  { label: 'Browse', to: '/design/v2/browse' },
  { label: 'Minimal+', to: '/design/v2/minimal' },
  { label: 'Seasonal', to: '/design/v2/seasonal' },
  { label: 'Collections', to: '/design/v2/collections' },
  { label: 'Magazine', to: '/design/v2/magazine' },
  { label: 'Bistro', to: '/design/v2/bistro' },
]
const features = [
  { label: 'Meal Planner', to: '/design/v2/planner' },
  { label: 'Budget', to: '/design/v2/budget' },
  { label: 'For You', to: '/design/v2/foryou' },
  { label: 'Time-based', to: '/design/v2/timer' },
  { label: 'Shopping List', to: '/design/v2/shopping' },
  { label: 'Community', to: '/design/v2/community' },
  { label: 'Nutrition', to: '/design/v2/nutrition' },
  { label: 'Surprise Me', to: '/design/v2/surprise' },
  { label: 'Mood', to: '/design/v2/mood' },
  { label: 'Assistant', to: '/design/v2/assistant' },
]

const Group: FC<{ label: string; items: { label: string; to: string }[]; tone?: 'refined' | 'rethought' | 'concept' }> = ({ label, items, tone }) => {
  const { pathname } = useLocation()
  return (
    <div className='group'>
      <div className={`group-label ${tone ?? ''}`}>{label}</div>
      <div className='pills'>
        {items.map(v => (
          <Link
            key={v.to}
            to={v.to}
            className={`pill ${pathname === v.to ? 'active' : ''}`}
          >
            {v.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

const DesignSwitcher: FC = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className={`design-switcher-v2 ${open ? 'open' : 'closed'}`}>
      <button
        className='toggle'
        onClick={() => setOpen(!open)}
        aria-label='Toggle design switcher'
      >
        <BiChevronUp className={`chev ${open ? 'down' : 'up'}`} />
        <span>Home designs</span>
      </button>
      {open && (
        <div className='panel'>
          <Group label='Original' items={original} />
          <Group label='Classic+' items={classicFamily} tone='refined' />
          <Group label='Refined' items={refined} tone='refined' />
          <Group label='Rethought' items={rethought} tone='rethought' />
          <Group label='Concept' items={concept} tone='concept' />
          <Group label='Filled-in' items={filledIn} tone='refined' />
          <Group label='Features' items={features} tone='concept' />
        </div>
      )}
    </div>
  )
}

export default DesignSwitcher
