import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { useSlashFocusSearch } from 'src/hooks/useSlashFocusSearch'

// Minimal harness: mounts the hook plus a search input (matching the real
// `.search-recipes-input` selector). `extra` is rendered *before* it so tests
// can inject an earlier-in-DOM input to exercise the "first visible" selection.
function Harness({ extra }: { extra?: React.ReactNode }) {
  useSlashFocusSearch()
  return (
    <div>
      {extra}
      <input
        className='search-recipes-input'
        aria-label='search'
        defaultValue='abc'
      />
    </div>
  )
}

describe('useSlashFocusSearch', () => {
  it('focuses the search input and selects its text on bare "/"', () => {
    render(<Harness />)
    const input = screen.getByLabelText('search') as HTMLInputElement
    expect(input).not.toHaveFocus()

    const notPrevented = fireEvent.keyDown(document, { key: '/' })

    expect(input).toHaveFocus()
    // preventDefault ran, so the "/" never reaches the field...
    expect(notPrevented).toBe(false)
    // ...and existing text is selected so it can be overtyped.
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(3)
  })

  it('does nothing while the user is already typing in a field', () => {
    render(
      <Harness extra={<input aria-label='other' defaultValue='' />} />
    )
    const other = screen.getByLabelText('other')
    const search = screen.getByLabelText('search')
    other.focus()

    // Event originates from the text field -> "/" should type normally.
    const notPrevented = fireEvent.keyDown(other, { key: '/' })

    expect(search).not.toHaveFocus()
    expect(other).toHaveFocus()
    expect(notPrevented).toBe(true)
  })

  it('does nothing while focus is inside an open modal dialog', () => {
    render(
      <Harness
        extra={
          <div role='dialog' aria-modal='true' aria-label='A modal'>
            <button aria-label='dialog-btn'>ok</button>
          </div>
        }
      />
    )
    const dialogBtn = screen.getByLabelText('dialog-btn')
    const search = screen.getByLabelText('search')
    dialogBtn.focus()

    // Focus is trapped in the dialog -> "/" must not escape it to the search.
    const notPrevented = fireEvent.keyDown(dialogBtn, { key: '/' })

    expect(search).not.toHaveFocus()
    expect(dialogBtn).toHaveFocus()
    expect(notPrevented).toBe(true)
  })

  it('ignores "/" pressed with a modifier held', () => {
    render(<Harness />)
    const search = screen.getByLabelText('search')

    fireEvent.keyDown(document, { key: '/', metaKey: true })
    fireEvent.keyDown(document, { key: '/', ctrlKey: true })

    expect(search).not.toHaveFocus()
  })

  it('skips a visibility:hidden input and focuses the next visible one', () => {
    render(
      <Harness
        extra={
          <input
            className='search-recipes-input'
            aria-label='hidden-search'
            style={{ visibility: 'hidden' }}
          />
        }
      />
    )
    const hidden = screen.getByLabelText('hidden-search')
    const visible = screen.getByLabelText('search')

    fireEvent.keyDown(document, { key: '/' })

    expect(hidden).not.toHaveFocus()
    expect(visible).toHaveFocus()
  })
})
