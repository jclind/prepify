import React, { useEffect } from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Settings from 'src/pages/Settings/Settings'
import { useSettingsDirty } from 'src/pages/Settings/SettingsDirtyContext'

// The shell renders the section rail + a back link, and routes the active
// section into the pane. When the active section has unsaved changes, clicking a
// rail link / back link must run confirmLeave() and cancel the navigation if the
// user declines. We stand in a fake "dirty" section for the Profile route so the
// guard has something to block.

const DirtySection = () => {
  const { setDirty } = useSettingsDirty()
  useEffect(() => {
    setDirty(true)
    return () => setDirty(false)
  }, [setDirty])
  return <div>profile pane body</div>
}

const renderShell = (initial = '/settings/profile') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path='/settings' element={<Settings />}>
          <Route path='profile' element={<DirtySection />} />
          <Route path='account' element={<div>account pane body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

// The pane header <h2> reflects the active section, so it's the cleanest signal
// of whether navigation actually happened.
const paneHeading = () => screen.getByRole('heading', { level: 2 }).textContent

describe('Settings shell — unsaved-changes nav guard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('cancels rail navigation when the user declines to discard changes', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderShell()
    expect(paneHeading()).toBe('Profile')

    fireEvent.click(screen.getByRole('link', { name: /Account & Security/i }))

    // Declined → still on Profile.
    expect(paneHeading()).toBe('Profile')
    expect(screen.getByText('profile pane body')).toBeInTheDocument()
  })

  it('allows rail navigation when the user confirms the discard', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderShell()

    fireEvent.click(screen.getByRole('link', { name: /Account & Security/i }))

    expect(paneHeading()).toBe('Account & Security')
    expect(screen.getByText('account pane body')).toBeInTheDocument()
  })

  it('does not prompt when navigating from a clean section', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    // Account is the clean section here (no setDirty), so leaving it is free.
    renderShell('/settings/account')

    fireEvent.click(screen.getByRole('link', { name: /^Profile/i }))

    expect(confirm).not.toHaveBeenCalled()
    expect(paneHeading()).toBe('Profile')
  })

  it('guards the mobile back link too', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderShell()

    fireEvent.click(screen.getByRole('link', { name: /^Settings$/i }))

    // Declined → stayed put on Profile.
    expect(paneHeading()).toBe('Profile')
  })
})
