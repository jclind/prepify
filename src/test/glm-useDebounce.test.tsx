import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useDebounce } from 'src/hooks/useDebounce'

// useDebounce delays propagating a value until `ms` pass with no further
// changes. Search inputs depend on exactly this: no request per keystroke, and
// a fresh keystroke must restart the window rather than queue a second update.
function Harness({ value, ms = 300 }: { value: string; ms?: number }) {
  const debounced = useDebounce(value, ms)
  return <span data-testid='out'>{debounced}</span>
}

// advance() runs the fake clock and lets React flush whatever the timer fired.
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms) })

describe('useDebounce', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('returns the initial value immediately, without waiting', () => {
    vi.useFakeTimers()
    render(<Harness value='pancake' />)
    expect(screen.getByTestId('out').textContent).toBe('pancake')
  })

  it('holds the old value until the delay elapses, then switches once', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness value='a' />)
    rerender(<Harness value='b' />)

    advance(299)
    expect(screen.getByTestId('out').textContent).toBe('a')

    advance(1)
    expect(screen.getByTestId('out').textContent).toBe('b')
  })

  it('restarts the window on every change instead of queueing updates', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness value='a' />)

    rerender(<Harness value='b' />)
    advance(200)
    rerender(<Harness value='c' />)
    // 400ms since 'b', but only 200 since 'c': still nothing propagated, and
    // 'b' must never appear at all.
    advance(200)
    expect(screen.getByTestId('out').textContent).toBe('a')

    advance(100)
    expect(screen.getByTestId('out').textContent).toBe('c')
  })

  it('honours a custom delay', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Harness value='a' ms={1000} />)
    rerender(<Harness value='b' ms={1000} />)
    advance(999)
    expect(screen.getByTestId('out').textContent).toBe('a')
    advance(1)
    expect(screen.getByTestId('out').textContent).toBe('b')
  })
})
