import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfileControls from 'src/pages/Account/components/ProfileControls'

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}))

const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
})

const renderControls = (username?: string) =>
  render(
    <MemoryRouter>
      <ProfileControls username={username} />
    </MemoryRouter>
  )

describe('ProfileControls — Share', () => {
  beforeEach(() => writeText.mockClear())

  it('copies the public /u/<handle> link, not the display name', async () => {
    renderControls('janedoe')
    fireEvent.click(screen.getByLabelText('Share profile'))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        `${window.location.origin}/u/janedoe`
      )
    )
  })

  it('falls back to the current URL when no handle is known', async () => {
    renderControls(undefined)
    fireEvent.click(screen.getByLabelText('Share profile'))

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(window.location.href)
    )
  })
})
