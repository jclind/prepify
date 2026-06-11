import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from 'react-modal'
import AchievementsModal from 'src/pages/Account/components/AchievementsModal'
import { Achievement } from 'types'

// react-modal needs an app element; #root is created in src/test/setup.ts.
beforeAll(() => Modal.setAppElement('#root'))

const achievements: Achievement[] = [
  {
    id: 'first_save',
    name: 'First Save',
    description: 'Saved your first recipe.',
    earned: true,
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Saved 25 recipes.',
    earned: false,
  },
  {
    id: 'first_recipe',
    name: 'First Recipe',
    description: 'Published your first recipe.',
    earned: true,
  },
]

describe('AchievementsModal', () => {
  it('lists earned and locked achievements with a progress count', () => {
    render(
      <AchievementsModal
        isOpen
        onClose={() => {}}
        achievements={achievements}
      />
    )

    // All achievements are listed, earned and locked alike...
    expect(screen.getByText('First Save')).toBeInTheDocument()
    expect(screen.getByText('Collector')).toBeInTheDocument()
    expect(screen.getByText('First Recipe')).toBeInTheDocument()
    // ...with the earned/total progress (2 of 3 earned).
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('dims locked achievements and highlights earned ones', () => {
    render(
      <AchievementsModal
        isOpen
        onClose={() => {}}
        achievements={achievements}
      />
    )

    const collector = screen.getByText('Collector').closest('.am-item')
    const firstSave = screen.getByText('First Save').closest('.am-item')
    expect(collector).toHaveClass('locked')
    expect(firstSave).toHaveClass('earned')
  })

  // Regression: the content frame must be position:absolute. react-modal centers
  // it with top/left:50% + translate(-50%,-50%); without an explicit position the
  // frame defaults to `static`, the offsets are ignored, and the translate yanks
  // the card off-screen (top-left). Caught only in a real browser, never jsdom.
  it('positions the modal frame absolutely so it stays centered', () => {
    render(
      <AchievementsModal isOpen onClose={() => {}} achievements={achievements} />
    )
    const frame = screen.getByRole('dialog')
    expect(frame).toHaveStyle({ position: 'absolute' })
  })

  it('renders nothing when closed', () => {
    render(
      <AchievementsModal
        isOpen={false}
        onClose={() => {}}
        achievements={achievements}
      />
    )
    expect(screen.queryByText('First Save')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <AchievementsModal isOpen onClose={onClose} achievements={achievements} />
    )
    fireEvent.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })
})
