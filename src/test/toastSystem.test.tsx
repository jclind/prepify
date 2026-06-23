/**
 * Toast system contract (react-hot-toast).
 *
 * Every other suite *mocks* `react-hot-toast`, so the actual notification
 * rendering — the thing users see — is never exercised. This suite mounts a
 * REAL `<Toaster>` (configured exactly as the app mounts it in `App.tsx:62`:
 * `position='bottom-center'`, `toastOptions={{ duration: 5000 }}`) and fires
 * real toasts to lock down the contract the call sites rely on:
 *   - the success / error / loading / blank shapes render their message,
 *   - status toasts are announced to assistive tech (role="status"),
 *   - same-`id` calls de-dupe/update in place rather than stacking,
 *   - programmatic dismiss removes a toast,
 *   - the app's one interactive custom toast — SaveControl's
 *     "Saved · Add to a collection" (`SaveControl.tsx:128`) — renders and its
 *     in-toast action dismisses itself via `toast.dismiss(t.id)`.
 */

import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import {
  render,
  screen,
  act,
  fireEvent,
  waitForElementToBeRemoved,
} from '@testing-library/react'
import toast, { Toaster } from 'react-hot-toast'

// Firing a toast updates the Toaster's internal store; wrap it in act() so the
// resulting render is flushed before we assert.
const fire = (fn: () => void) => act(() => void fn())

const renderToaster = () =>
  render(<Toaster position='bottom-center' toastOptions={{ duration: 5000 }} />)

afterEach(() => {
  // Toast state is a module-level singleton — clear it so toasts don't bleed
  // into the next test. remove() (vs dismiss()) drops them with no exit delay.
  act(() => toast.remove())
})

describe('toast system (react-hot-toast contract)', () => {
  it('renders a success toast with its message', async () => {
    renderToaster()
    fire(() => toast.success('Profile updated!'))
    expect(await screen.findByText('Profile updated!')).toBeInTheDocument()
  })

  it('renders an error toast with its message', async () => {
    renderToaster()
    fire(() => toast.error('Could not save your rating. Please try again.'))
    expect(
      await screen.findByText('Could not save your rating. Please try again.')
    ).toBeInTheDocument()
  })

  it('renders a loading toast with its message', async () => {
    renderToaster()
    fire(() => toast.loading('Saving…'))
    expect(await screen.findByText('Saving…')).toBeInTheDocument()
  })

  it('renders a neutral (blank) toast with its message', async () => {
    renderToaster()
    fire(() => toast('Recipe marked as read, share your feedback below!'))
    expect(
      await screen.findByText('Recipe marked as read, share your feedback below!')
    ).toBeInTheDocument()
  })

  it('announces status toasts to assistive technology', async () => {
    renderToaster()
    fire(() => toast.success('Welcome to Prepify!'))
    // react-hot-toast wraps the message in role="status" / aria-live="polite"
    // so screen readers announce it without stealing focus.
    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Welcome to Prepify!')
  })

  it('de-dupes toasts that share an id, updating in place instead of stacking', async () => {
    renderToaster()
    // Two calls with the same explicit id resolve to ONE toast whose content is
    // replaced — the contract that lets a call site refresh a notification
    // (e.g. loading → success) without piling up duplicates.
    fire(() => toast('First message', { id: 'dedupe' }))
    expect(await screen.findByText('First message')).toBeInTheDocument()

    fire(() => toast.success('Updated message', { id: 'dedupe' }))
    expect(await screen.findByText('Updated message')).toBeInTheDocument()
    expect(screen.queryByText('First message')).not.toBeInTheDocument()
    // Exactly one live toast remains for that id.
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('removes a toast when dismissed by id', async () => {
    renderToaster()
    let id = ''
    fire(() => {
      id = toast.success('Recipe published.')
    })
    await screen.findByText('Recipe published.')

    fire(() => toast.dismiss(id))
    // dismiss() animates out, then unmounts after the ~1s removeDelay.
    await waitForElementToBeRemoved(
      () => screen.queryByText('Recipe published.'),
      { timeout: 3000 }
    )
    expect(screen.queryByText('Recipe published.')).not.toBeInTheDocument()
  })

  it('renders the interactive "Saved · Add to a collection" custom toast and self-dismisses on action', async () => {
    renderToaster()
    let opened = false
    // Mirrors SaveControl.tsx:128 — a JSX toast whose action button closes the
    // toast (toast.dismiss(t.id)) and runs a side effect (open the popover).
    fire(() =>
      toast(
        t => (
          <span className='save-toast'>
            Saved ·{' '}
            <button
              type='button'
              className='save-toast__action'
              onClick={() => {
                toast.dismiss(t.id)
                opened = true
              }}
            >
              Add to a collection
            </button>
          </span>
        ),
        { duration: 5000 }
      )
    )

    const action = await screen.findByRole('button', {
      name: 'Add to a collection',
    })
    expect(action).toBeInTheDocument()

    fireEvent.click(action)
    expect(opened).toBe(true)
    await waitForElementToBeRemoved(
      () => screen.queryByText('Add to a collection'),
      { timeout: 3000 }
    )
  })
})
