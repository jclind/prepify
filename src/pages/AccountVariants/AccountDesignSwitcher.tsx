import React, { FC, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BiChevronUp } from 'react-icons/bi'
import './AccountDesignSwitcher.scss'

const refined = [
  { label: 'Polished', to: '/design/account-polished' },
  { label: 'Cover', to: '/design/account-cover' },
  { label: 'Sidebar', to: '/design/account-sidebar' },
  { label: 'Card', to: '/design/account-card' },
  { label: 'Hero+', to: '/design/account-hero' },
]
const rethought = [
  { label: 'Dashboard', to: '/design/account-dashboard' },
  { label: 'Cookbook', to: '/design/account-cookbook' },
  { label: 'Timeline', to: '/design/account-timeline' },
  { label: 'Stats', to: '/design/account-stats' },
  { label: 'Collections', to: '/design/account-collections' },
]

const Group: FC<{ label: string; items: { label: string; to: string }[]; tone?: 'refined' | 'rethought' }> = ({ label, items, tone }) => {
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

const AccountDesignSwitcher: FC = () => {
  const [open, setOpen] = useState(true)

  return (
    <div className={`account-design-switcher ${open ? 'open' : 'closed'}`}>
      <button
        className='toggle'
        onClick={() => setOpen(!open)}
        aria-label='Toggle design switcher'
      >
        <BiChevronUp className={`chev ${open ? 'down' : 'up'}`} />
        <span>Account designs</span>
      </button>
      {open && (
        <div className='panel'>
          <Group label='Refined' items={refined} tone='refined' />
          <Group label='Rethought' items={rethought} tone='rethought' />
        </div>
      )}
    </div>
  )
}

export default AccountDesignSwitcher
