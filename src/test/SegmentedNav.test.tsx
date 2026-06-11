import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SegmentedNav from 'src/pages/Account/components/SegmentedNav'
import { AccountTabCounts } from 'types'

const renderNav = (path: string, counts?: AccountTabCounts) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SegmentedNav counts={counts} />
    </MemoryRouter>
  )

describe('SegmentedNav', () => {
  it('marks the tab matching the current route active', () => {
    renderNav('/account/ratings')
    expect(screen.getByText('Ratings')).toHaveClass('active')
    expect(screen.getByText('Saved')).not.toHaveClass('active')
  })

  it('treats the bare /account path as the Saved tab', () => {
    renderNav('/account')
    expect(screen.getByText('Saved')).toHaveClass('active')
  })

  it('falls back to the first tab for an unrecognized path', () => {
    renderNav('/account/something-unknown')
    expect(screen.getByText('Saved')).toHaveClass('active')
  })

  it('shows non-zero counts and hides zero/absent ones', () => {
    renderNav('/account/saved-recipes', {
      saved: 5,
      ratings: 0,
      recipes: 2,
      drafts: 0,
    })
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('renders no counts at all when none are provided', () => {
    renderNav('/account/saved-recipes')
    // Labels only — no numeric badges.
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('drives the sliding indicator position from the active index', () => {
    // tabs: saved=0, ratings=1, recipes(your-recipes)=2, drafts=3
    const { container } = renderNav('/account/your-recipes')
    const seg = container.querySelector('.acct-segment') as HTMLElement
    expect(seg.style.getPropertyValue('--seg-i')).toBe('2')
    expect(seg.style.getPropertyValue('--seg-n')).toBe('4')
  })
})
