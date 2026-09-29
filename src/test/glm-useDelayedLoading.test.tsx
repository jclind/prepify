import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useDelayedLoading } from 'src/hooks/useDelayedLoading'

// useDelayedLoading gates skeleton placeholders behind a delay: a query that
// resolves fast never flashes a skeleton, a genuinely slow one still gets one,
// and the skeleton disappears the moment loading ends.
function Harness({ loading, delayMs }: { loading: boolean; delayMs?: number }) {
  const show = useDelayedLoading(loading, delayMs)
  return <span data-testid='out'>{String(show)}</span>
}

// advance() runs the fake clock and lets React flush whatever the timer fired.
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('useDelayedLoading', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('stays false while not loading, even after a long time', () => {
    vi.useFakeTimers()
    render(<Harness loading={false} />)
    advance(5000)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('stays false for a load that finishes within the delay (no skeleton flash)', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness loading={true} />)
    // A fast query resolves before the 220ms default delay.
    advance(219)
    rerender(<Harness loading={false} />)
    advance(1000)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('turns true once loading has persisted past the delay', () => {
    vi.useFakeTimers()
    render(<Harness loading={true} />)
    advance(219)
    expect(screen.getByTestId('out').textContent).toBe('false')
    advance(1)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })

  it('resets to false the moment loading ends, without waiting out the delay', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness loading={true} />)
    advance(300)
    expect(screen.getByTestId('out').textContent).toBe('true')
    rerender(<Harness loading={false} />)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('honours a custom delay', () => {
    vi.useFakeTimers()
    render(<Harness loading={true} delayMs={100} />)
    advance(99)
    expect(screen.getByTestId('out').textContent).toBe('false')
    advance(1)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })
})
