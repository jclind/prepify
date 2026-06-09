import React, { FC, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BiChevronUp } from 'react-icons/bi'
import './RecipeDesignSwitcher.scss'

const base = [
  { label: 'Polished', to: '/design/recipe/polished' },
]
const polishedPlus = [
  { label: 'Plus', to: '/design/recipe/plus' },
  { label: 'Rail', to: '/design/recipe/rail' },
  { label: 'Dashboard', to: '/design/recipe/dashboard' },
  { label: 'Feature', to: '/design/recipe/feature' },
  { label: 'Studio', to: '/design/recipe/studio' },
]
const classic = [
  { label: 'Classic', to: '/design/recipe/classic' },
  { label: 'Warm', to: '/design/recipe/classic-warm' },
  { label: 'Bordered', to: '/design/recipe/classic-bordered' },
  { label: 'Centered', to: '/design/recipe/classic-centered' },
  { label: 'Compact', to: '/design/recipe/classic-compact' },
]
const bordered = [
  { label: 'Refined', to: '/design/recipe/bordered-refined' },
  { label: 'Accent', to: '/design/recipe/bordered-accent' },
  { label: 'Teal', to: '/design/recipe/bordered-teal' },
  { label: 'Split', to: '/design/recipe/bordered-split' },
  { label: 'Soft', to: '/design/recipe/bordered-soft' },
  { label: 'Soft+', to: '/design/recipe/bordered-soft-plus' },
]
const softHeaders = [
  { label: 'Strip', to: '/design/recipe/soft-strip' },
  { label: 'Overlay', to: '/design/recipe/soft-overlay' },
  { label: 'Toolbar', to: '/design/recipe/soft-toolbar' },
  { label: 'Bar', to: '/design/recipe/soft-bar' },
  { label: 'Bar 2', to: '/design/recipe/soft-bar-balanced' },
  { label: 'Segment', to: '/design/recipe/soft-segment' },
]
const instructions = [
  { label: '2-col news', to: '/design/recipe/instr-twocol-news' },
  { label: '2-col rows', to: '/design/recipe/instr-twocol-rows' },
  { label: 'Aside: items', to: '/design/recipe/instr-sidebar-ing' },
  { label: 'Aside: notes', to: '/design/recipe/instr-sidebar-notes' },
  { label: 'Narrow', to: '/design/recipe/instr-narrow' },
  { label: 'Narrow tight', to: '/design/recipe/instr-narrow-tight' },
]

const Group: FC<{ label: string; items: { label: string; to: string }[]; tone?: 'rethought' | 'polished' | 'cards' }> = ({ label, items, tone }) => {
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

const RecipeDesignSwitcher: FC = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className={`recipe-design-switcher ${open ? 'open' : 'closed'}`}>
      <button
        className='toggle'
        onClick={() => setOpen(!open)}
        aria-label='Toggle design switcher'
      >
        <BiChevronUp className={`chev ${open ? 'down' : 'up'}`} />
        <span>Recipe designs</span>
      </button>
      {open && (
        <div className='panel'>
          <Group label='Base' items={base} tone='polished' />
          <Group label='Polished+' items={polishedPlus} tone='rethought' />
          <Group label='Classic' items={classic} tone='cards' />
          <Group label='Bordered' items={bordered} tone='rethought' />
          <Group label='Soft headers' items={softHeaders} tone='polished' />
          <Group label='Instructions' items={instructions} tone='cards' />
        </div>
      )}
    </div>
  )
}

export default RecipeDesignSwitcher
