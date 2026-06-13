import React, { FC } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { FiUser, FiShield, FiEye, FiAlertTriangle } from 'react-icons/fi'
import { IconType } from 'react-icons'
import './Settings.scss'

type Section = {
  label: string
  blurb: string
  path: string
  icon: IconType
  danger?: boolean
}

// The four live settings sections. Cooking Preferences + Notifications are
// deferred until their underlying features exist, so they're intentionally
// absent. The index route ('/settings') is Profile.
const SECTIONS: Section[] = [
  {
    label: 'Profile',
    blurb: 'Your public identity — avatar, name, username and bio.',
    path: '/settings',
    icon: FiUser,
  },
  {
    label: 'Account & Security',
    blurb: 'Your email, password and connected sign-in methods.',
    path: '/settings/account',
    icon: FiShield,
  },
  {
    label: 'Privacy',
    blurb: 'Control who can see your profile and recipes.',
    path: '/settings/privacy',
    icon: FiEye,
  },
  {
    label: 'Danger Zone',
    blurb: 'Export your data or permanently delete your account.',
    path: '/settings/danger',
    icon: FiAlertTriangle,
    danger: true,
  },
]

const Settings: FC = () => {
  const { pathname } = useLocation()
  // Exact match on the deeper routes; everything else (the index) falls back to
  // Profile so the sidebar + pane header always have an active section.
  const active = SECTIONS.find(s => s.path === pathname) ?? SECTIONS[0]

  return (
    <div className='page settings-page'>
      <h1 className='settings-title'>Settings</h1>

      <div className='settings-shell'>
        <nav className='settings-nav' aria-label='Settings sections'>
          {SECTIONS.map(s => {
            const Icon = s.icon
            const isActive = s.path === active.path
            return (
              <Link
                key={s.path}
                to={s.path}
                className={`settings-navitem ${isActive ? 'active' : ''} ${
                  s.danger ? 'danger' : ''
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className='settings-navicon' />
                <span>{s.label}</span>
              </Link>
            )
          })}
        </nav>

        <section className='settings-pane'>
          <header className='settings-panehead'>
            <h2>{active.label}</h2>
            <p>{active.blurb}</p>
          </header>
          <Outlet />
        </section>
      </div>
    </div>
  )
}

export default Settings
