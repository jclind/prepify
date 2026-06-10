import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LevelCard from 'src/pages/Account/components/LevelCard'

vi.mock('react-hot-toast', () => ({
  default: vi.fn(),
}))

import toast from 'react-hot-toast'

const mockToast = toast as unknown as ReturnType<typeof vi.fn>

describe('LevelCard', () => {
  beforeEach(() => mockToast.mockReset())

  it('renders the level, rank, and XP-to-next-level label', () => {
    render(
      <LevelCard level={7} rank='Chef' xp={1280} xpNext={2000} pct={64} />
    )
    expect(screen.getByText('Lv 7')).toBeInTheDocument()
    expect(screen.getByText('Chef')).toBeInTheDocument()
    expect(
      screen.getByText('1,280 / 2,000 XP to Level 8')
    ).toBeInTheDocument()
  })

  it('drives the XP bar width from pct', () => {
    const { container } = render(
      <LevelCard level={3} rank='Home Cook' xp={50} xpNext={200} pct={25} />
    )
    const fill = container.querySelector('.acct-xpbar-fill') as HTMLElement
    expect(fill.style.width).toBe('25%')
  })

  it('toasts a coming-soon message when the card is clicked', () => {
    render(
      <LevelCard level={1} rank='New Cook' xp={0} xpNext={100} pct={0} />
    )
    fireEvent.click(screen.getByRole('button'))
    expect(mockToast).toHaveBeenCalledWith('Rewards & badges coming soon')
  })
})
