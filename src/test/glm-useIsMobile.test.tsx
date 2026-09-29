import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useIsMobile } from 'src/Components/Navbar/menu/useIsMobile'

// useIsMobile mounts the mobile nav only at the hamburger breakpoint. It must
// read the media query at mount AND keep following breakpoint changes, so the
// menu appears/disappears on a live resize rather than only on remount.
function Harness() {
  const isMobile = useIsMobile()
  return <span data-testid='out'>{String(isMobile)}</span>
}

// A controllable MediaQueryList: `matches` flips and registered change
// listeners fire, standing in for a real viewport crossing the breakpoint.
function installMatchMedia() {
  const listeners = new Set<() => void>()
  const mql = {
    matches: false,
    media: '(max-width: 725px)',
    onchange: null,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => false,
  }
  const matchMedia = vi.fn().mockReturnValue(mql)
  const original = window.matchMedia
  window.matchMedia = matchMedia as unknown as typeof window.matchMedia
  const setMatches = (v: boolean) => {
    mql.matches = v
    act(() => {
      listeners.forEach(l => l())
    })
  }
  return {
    matchMedia,
    setMatches,
    restore: () => {
      window.matchMedia = original
    },
  }
}

describe('useIsMobile', () => {
  let mm: ReturnType<typeof installMatchMedia>

  afterEach(() => {
    mm?.restore()
  })

  it('reads false on a desktop viewport at mount', () => {
    mm = installMatchMedia()
    render(<Harness />)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('reads true at mount when already at the mobile breakpoint', () => {
    mm = installMatchMedia()
    mm.matchMedia.mockReturnValue({
      matches: true,
      media: '(max-width: 725px)',
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList)
    render(<Harness />)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })

  it('follows the viewport crossing the breakpoint after mount', () => {
    mm = installMatchMedia()
    render(<Harness />)
    expect(screen.getByTestId('out').textContent).toBe('false')

    mm.setMatches(true) // window narrowed past 725px
    expect(screen.getByTestId('out').textContent).toBe('true')

    mm.setMatches(false) // widened again
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('stays false and does not crash when matchMedia is unavailable', () => {
    const original = window.matchMedia
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    try {
      render(<Harness />)
      expect(screen.getByTestId('out').textContent).toBe('false')
    } finally {
      window.matchMedia = original
    }
  })
})
