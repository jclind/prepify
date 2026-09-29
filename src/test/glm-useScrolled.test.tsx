import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useScrolled } from 'src/Components/Navbar/desktop/useScrolled'

// useScrolled flips the desktop bar from transparent-over-hero to solid once
// the page scrolls past a threshold. In this app <body> is the scroll
// container, so the hook reads documentElement/body scrollTop; tests drive
// those directly and fire the scroll event.
function Harness({ threshold }: { threshold?: number }) {
  const scrolled = useScrolled(threshold)
  return <span data-testid='out'>{String(scrolled)}</span>
}

const setScrollTop = (px: number) => {
  document.documentElement.scrollTop = px
  document.body.scrollTop = px
}

describe('useScrolled', () => {
  afterEach(() => {
    setScrollTop(0)
  })

  it('starts false at the top of the page', () => {
    setScrollTop(0)
    render(<Harness />)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('turns true once scrolled past the default threshold', () => {
    setScrollTop(0)
    render(<Harness />)

    setScrollTop(5)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('false')

    setScrollTop(11)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })

  it('turns back false when the user scrolls up past the threshold', () => {
    setScrollTop(0)
    render(<Harness />)

    setScrollTop(11)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('true')

    setScrollTop(0)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('false')
  })

  it('honours a custom threshold', () => {
    setScrollTop(0)
    render(<Harness threshold={100} />)

    setScrollTop(50)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('false')

    setScrollTop(150)
    fireEvent.scroll(window)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })

  it('reads true at mount when the page was already scrolled (e.g. reload mid-page)', () => {
    setScrollTop(50)
    render(<Harness />)
    expect(screen.getByTestId('out').textContent).toBe('true')
  })
})
