import { AlertTriangleIcon, ArrowLeftIcon, ChevronRightIcon, EyeIcon, ShieldIcon, UserIcon, IconType } from 'src/Components/icons'
import React, { FC } from 'react'
import { Helmet } from 'react-helmet-async'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { SettingsDirtyProvider, useSettingsDirty } from './SettingsDirtyContext'
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
// absent. Profile is also the index route ('/settings') so a direct visit /
// desktop landing still shows it.
const SECTIONS: Section[] = [
  {
    label: 'Profile',
    blurb: 'Your public identity — avatar, name, username and bio.',
    path: '/settings/profile',
    icon: UserIcon,
  },
  {
    label: 'Account & Security',
    blurb: 'Your email, password and connected sign-in methods.',
    path: '/settings/account',
    icon: ShieldIcon,
  },
  {
    label: 'Privacy',
    blurb: 'Control who can see your profile and recipes.',
    path: '/settings/privacy',
    icon: EyeIcon,
  },
  {
    label: 'Danger Zone',
    blurb: 'Export your data or permanently delete your account.',
    path: '/settings/danger',
    icon: AlertTriangleIcon,
    danger: true,
  },
]

const SettingsShell: FC = () => {
  const { pathname } = useLocation()
  const { confirmLeave } = useSettingsDirty()
  // Mobile is master-detail: the root (/settings) is the section list, a deeper
  // path is one section's detail with a back link. Desktop shows the rail + pane
  // together regardless, so this class only drives the mobile behaviour (see
  // Settings.scss). The index falls back to Profile for the pane header.
  const isIndex = pathname === '/settings' || pathname === '/settings/'
  const active = SECTIONS.find(s => s.path === pathname) ?? SECTIONS[0]

  // Cancel the navigation if the active section has unsaved changes and the user
  // declines to discard them. Covers the rail links and the mobile back link.
  const guard = (e: React.MouseEvent) => {
    if (!confirmLeave()) e.preventDefault()
  }

  return (
    <div className={`page settings-page ${isIndex ? 'at-index' : 'at-section'}`}>
      <Helmet>
        <title>Settings · Prepify</title>
        <meta name='robots' content='noindex' />
      </Helmet>
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
                onClick={guard}
                className={`settings-navitem ${isActive ? 'active' : ''} ${
                  s.danger ? 'danger' : ''
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className='settings-navicon' />
                <span className='settings-navtext'>
                  <span className='settings-navlabel'>{s.label}</span>
                  <span className='settings-navblurb'>{s.blurb}</span>
                </span>
                <ChevronRightIcon className='settings-navchevron' />
              </Link>
            )
          })}
        </nav>

        <section className='settings-pane'>
          <Link to='/settings' className='settings-back' onClick={guard}>
            <ArrowLeftIcon /> Settings
          </Link>
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

const Settings: FC = () => (
  <SettingsDirtyProvider>
    <SettingsShell />
  </SettingsDirtyProvider>
)

export default Settings
