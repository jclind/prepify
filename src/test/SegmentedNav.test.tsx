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
  // The label now lives in a span inside the tab link, so the `active` class is
  // on the closest `.acct-seg` link, not on the text node itself.
  const tab = (label: string) =>
    screen.getByText(label).closest('.acct-seg') as HTMLElement

  it('marks the tab matching the current route active', () => {
    renderNav('/account/ratings')
    expect(tab('Ratings')).toHaveClass('active')
    expect(tab('Saved')).not.toHaveClass('active')
  })

  it('treats the bare /account path as the Saved tab', () => {
    renderNav('/account')
    expect(tab('Saved')).toHaveClass('active')
  })

  it('falls back to the first tab for an unrecognized path', () => {
    renderNav('/account/something-unknown')
    expect(tab('Saved')).toHaveClass('active')
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

  it('renders all four tabs as links pointing at their routes', () => {
    renderNav('/account/saved-recipes')
    expect(tab('Saved')).toHaveAttribute('href', '/account/saved-recipes')
    expect(tab('Ratings')).toHaveAttribute('href', '/account/ratings')
    expect(tab('Your Recipes')).toHaveAttribute('href', '/account/your-recipes')
    expect(tab('Drafts')).toHaveAttribute('href', '/account/drafts')
  })
})
