import React from 'react'
import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from 'src/Components/Footer/Footer'

// The footer reads auth state to swap the Account column between signed-in and
// signed-out links; mock useAuth so we can drive both states. (Mocking the whole
// module also keeps Firebase out of these presentational tests.)
const authState = vi.hoisted(() => ({ user: null as unknown }))
vi.mock('src/context/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}))

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  )

describe('Footer', () => {
  beforeEach(() => {
    authState.user = null // default: signed out
  })

  it('renders internal nav links as client-side routes (href = path)', () => {
    renderFooter()
    expect(screen.getByRole('link', { name: 'All recipes' })).toHaveAttribute(
      'href',
      '/recipes'
    )
    expect(screen.getByRole('link', { name: 'Add a recipe' })).toHaveAttribute(
      'href',
      '/add-recipe'
    )
  })

  it('renders external/placeholder and mailto links as plain anchors', () => {
    renderFooter()
    // Placeholder pages aren't built yet — they must stay '#', not become routes.
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '#'
    )
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      'mailto:JesseLindCS@gmail.com'
    )
  })

  it('exposes accessible labels on social icons and opens them safely', () => {
    renderFooter()
    const instagram = screen.getByRole('link', { name: 'Instagram' })
    expect(instagram).toHaveAttribute('target', '_blank')
    expect(instagram).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('groups the link columns under a single labelled nav landmark', () => {
    renderFooter()
    expect(
      screen.getByRole('navigation', { name: 'Footer' })
    ).toBeInTheDocument()
  })

  it('shows the copyright line', () => {
    renderFooter()
    expect(
      screen.getByText(`© ${new Date().getFullYear()} Prepify`)
    ).toBeInTheDocument()
  })

  describe('Account column by auth state', () => {
    it('shows Sign in / Create account when signed out', () => {
      authState.user = null
      renderFooter()
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
      expect(
        screen.getByRole('link', { name: 'Create account' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'My recipes' })
      ).not.toBeInTheDocument()
    })

    it('swaps to the account pages when signed in', () => {
      authState.user = { uid: 'abc123' }
      renderFooter()
      expect(
        screen.getByRole('link', { name: 'My recipes' })
      ).toHaveAttribute('href', '/account/your-recipes')
      expect(
        screen.getByRole('link', { name: 'Saved recipes' })
      ).toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Sign in' })
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('link', { name: 'Create account' })
      ).not.toBeInTheDocument()
    })
  })
})
