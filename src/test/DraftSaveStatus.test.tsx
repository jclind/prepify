import { render, screen } from '@testing-library/react'
import DraftSaveStatus from 'src/pages/AddRecipe/DraftSaveStatus'

describe('DraftSaveStatus', () => {
  it('renders nothing but the reserved slot when idle', () => {
    const { container } = render(<DraftSaveStatus status='idle' />)
    const el = container.querySelector('.draft-save-status')
    expect(el).toBeTruthy()
    expect(el?.textContent).toBe('')
    expect(el?.className).toContain('idle')
  })

  it('shows the calm sign-in copy when signed out (not the error badge)', () => {
    const { container } = render(<DraftSaveStatus status='signed-out' />)
    expect(screen.getByText('Sign in to save drafts')).toBeTruthy()
    const el = container.querySelector('.draft-save-status')
    expect(el?.className).toContain('signed-out')
    // The signed-out state must never carry the error class/styling.
    expect(el?.className).not.toContain('error')
    expect(screen.queryByText("Couldn't save draft")).toBeNull()
  })

  it('still shows the error badge for a genuine save failure', () => {
    render(<DraftSaveStatus status='error' />)
    expect(screen.getByText("Couldn't save draft")).toBeTruthy()
  })

  it('shows a distinct reload prompt on a cross-tab conflict (not the generic error)', () => {
    const { container } = render(<DraftSaveStatus status='conflict' />)
    expect(screen.getByText('Reload to see the latest')).toBeTruthy()
    const el = container.querySelector('.draft-save-status')
    expect(el?.className).toContain('conflict')
    // A conflict is not a save failure — it must never read as the error badge.
    expect(el?.className).not.toContain('error')
    expect(screen.queryByText("Couldn't save draft")).toBeNull()
  })

  it('reflects the saving and saved states', () => {
    const { rerender } = render(<DraftSaveStatus status='saving' />)
    expect(screen.getByText('Saving draft…')).toBeTruthy()
    rerender(<DraftSaveStatus status='saved' />)
    expect(screen.getByText('Draft saved')).toBeTruthy()
  })
})
