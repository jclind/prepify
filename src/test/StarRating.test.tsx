import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StarRating from 'src/Components/StarRating/StarRating'

// ─── StarRating — interactive keyboard a11y (WAI-ARIA radiogroup) ────────────

describe('StarRating (interactive radiogroup)', () => {
  it('renders a radiogroup container and five radio stars', () => {
    render(<StarRating interactive rating={3} onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('aria-checked is true only on the star matching rating', () => {
    render(<StarRating interactive rating={3} onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    radios.forEach((radio, idx) => {
      const starNumber = idx + 1
      expect(radio).toHaveAttribute('aria-checked', String(starNumber === 3))
    })
  })

  it('roving tabindex: only the star at rating is a tab stop', () => {
    render(<StarRating interactive rating={3} onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    radios.forEach((radio, idx) => {
      const starNumber = idx + 1
      expect(radio).toHaveAttribute('tabIndex', starNumber === 3 ? '0' : '-1')
    })
  })

  it('roving tabindex falls back to star 1 when rating is 0', () => {
    render(<StarRating interactive rating={0} onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    radios.forEach((radio, idx) => {
      const starNumber = idx + 1
      expect(radio).toHaveAttribute('tabIndex', starNumber === 1 ? '0' : '-1')
    })
  })

  it('clicking a star reports its value through onChange', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={0} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('radio')[1])
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('ArrowRight moves DOM focus onto the newly-selected star', () => {
    render(<StarRating interactive rating={3} onChange={vi.fn()} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'ArrowRight' })
    // Roving tabindex: the selection move must carry keyboard focus with it.
    expect(radios[3]).toHaveFocus()
  })

  it('ArrowRight moves selection forward by one', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={3} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('ArrowLeft moves selection back by one', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={3} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it('Home jumps to the first star', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={3} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'Home' })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('End jumps to the last star', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={3} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'End' })
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('ArrowRight at rating=5 stays clamped at 5', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={5} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[4], { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith(5)
  })

  it('ArrowLeft at rating=1 stays clamped at 1', () => {
    const onChange = vi.fn()
    render(<StarRating interactive rating={1} onChange={onChange} />)
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[0], { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it('display mode (non-interactive) renders role="img" with no radio roles', () => {
    render(<StarRating rating={4} />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('aria-label', 'Rated 4 out of 5')
    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
  })
})
