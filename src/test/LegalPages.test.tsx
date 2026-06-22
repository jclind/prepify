import React, { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import About from 'src/pages/About/About'
import Privacy from 'src/pages/Privacy/Privacy'
import Terms from 'src/pages/Terms/Terms'

// The legal/company pages are purely presentational (no auth/Firebase), so we
// render the page components directly; HelmetProvider supplies the <title>
// context and MemoryRouter the <Link> context.
const renderPage = (ui: ReactElement) =>
  render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>
  )

describe('Legal / company pages', () => {
  it('About renders its heading and calls to action', () => {
    renderPage(<About />)
    // "About Prepify" is the eyebrow; the marketing headline is the <h1>.
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /recipes that tell you the whole story/i,
      })
    ).toBeInTheDocument()
    expect(screen.getByText('About Prepify')).toBeInTheDocument()
    // The CTAs appear twice (hero + closing section); assert every instance
    // points where it should rather than requiring a single match.
    const browseLinks = screen.getAllByRole('link', { name: 'Browse recipes' })
    expect(browseLinks.length).toBeGreaterThan(0)
    browseLinks.forEach(link =>
      expect(link).toHaveAttribute('href', '/recipes')
    )
    const signupLinks = screen.getAllByRole('link', {
      name: 'Create an account',
    })
    expect(signupLinks.length).toBeGreaterThan(0)
    signupLinks.forEach(link => expect(link).toHaveAttribute('href', '/signup'))
  })

  it('Privacy renders its heading and the draft/professional-review note', () => {
    renderPage(<Privacy />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/reviewed by a qualified\s+legal professional/i)
    ).toBeInTheDocument()
    // Page-specific section, so the test fails if the actual policy body is lost
    // (the draft note above comes from the shared LegalDocument, not Privacy).
    expect(
      screen.getByRole('heading', { level: 2, name: 'Information we collect' })
    ).toBeInTheDocument()
  })

  it('Terms renders its heading and the draft/professional-review note', () => {
    renderPage(<Terms />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Terms of Service' })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/reviewed by a qualified\s+legal professional/i)
    ).toBeInTheDocument()
    // Page-specific section (see Privacy test above): guards the Terms body, in
    // particular the estimates-not-advice disclaimer's home section.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Nutrition and price estimates' })
    ).toBeInTheDocument()
  })
})
