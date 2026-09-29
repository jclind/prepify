import React from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { useBodyScrollLock } from 'src/Components/Navbar/menu/useBodyScrollLock'

// useBodyScrollLock freezes <body> overflow while a modal menu is open and —
// the part worth pinning — restores whatever overflow was there before, so
// closing the menu can't clobber a style something else had set.
function Harness({ locked }: { locked: boolean }) {
  useBodyScrollLock(locked)
  return null
}

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('sets overflow:hidden on body while locked', () => {
    const { rerender } = render(<Harness locked={false} />)
    expect(document.body.style.overflow).not.toBe('hidden')

    rerender(<Harness locked={true} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores the previous overflow value on unlock', () => {
    document.body.style.overflow = 'auto'
    const { rerender } = render(<Harness locked={true} />)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<Harness locked={false} />)
    expect(document.body.style.overflow).toBe('auto')
  })

  it('restores the previous value on unmount while still locked', () => {
    document.body.style.overflow = 'scroll'
    const { unmount } = render(<Harness locked={true} />)
    expect(document.body.style.overflow).toBe('hidden')

    unmount()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('leaves body overflow alone when never locked', () => {
    document.body.style.overflow = 'auto'
    const { unmount } = render(<Harness locked={false} />)
    unmount()
    expect(document.body.style.overflow).toBe('auto')
  })
})
