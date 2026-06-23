import React from 'react'
import { vi } from 'vitest'
import {
  render,
  screen,
  fireEvent,
  renderHook,
  act,
} from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DesktopNav from 'src/Components/Navbar/desktop/DesktopNav'
import { useScrolled } from 'src/Components/Navbar/desktop/useScrolled'
import { DesktopNavProps } from 'src/Components/Navbar/desktop/types'

// The search input pulls in RecipeAPI + autocomplete; stub it so these tests
// focus on the bar's own structure/behavior.
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => <div data-testid='search-stub' />,
}))

const baseProps = (
  overrides: Partial<DesktopNavProps> = {}
): DesktopNavProps => ({
  darkNavLinks: true,
  scrolled: false,
  isLoggedIn: false,
  authLoading: false,
  username: '',
  email: '',
  photoURL: null,
  logout: vi.fn(),
  ...overrides,
})

const renderNav = (props: DesktopNavProps) =>
  render(
    <MemoryRouter>
      <DesktopNav {...props} />
    </MemoryRouter>
  )

describe('DesktopNav structure', () => {
  it('always renders the persistent search', () => {
    renderNav(baseProps())
    expect(screen.getByTestId('search-stub')).toBeInTheDocument()
  })

  it('logged out: shows Recipes + Login/Signup CTAs, no account menu', () => {
    renderNav(baseProps({ isLoggedIn: false }))

    expect(screen.getByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument()

    expect(
      screen.queryByRole('link', { name: 'Create Recipe' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Saved recipes' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Account menu' })
    ).not.toBeInTheDocument()
  })

  it('logged in: shows Create Recipe + Saved + account menu, no CTAs', () => {
    renderNav(
      baseProps({ isLoggedIn: true, username: 'chef' })
    )

    expect(
      screen.getByRole('link', { name: 'Create Recipe' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Saved recipes' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Account menu' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Log in' })
    ).not.toBeInTheDocument()
  })

  it('shows a loading skeleton while auth resolves (no CTAs or menu yet)', () => {
    renderNav(baseProps({ isLoggedIn: false, authLoading: true }))
    expect(
      screen.queryByRole('link', { name: 'Log in' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Account menu' })
    ).not.toBeInTheDocument()
  })

  it('the primary links live in a labelled <nav> landmark', () => {
    renderNav(baseProps({ isLoggedIn: true, username: 'chef' }))
    expect(
      screen.getByRole('navigation', { name: 'Primary' })
    ).toBeInTheDocument()
  })

  it('keeps an accessible name on the icon-collapsible links', () => {
    // Recipes/Create collapse to icon-only below 1000px; the aria-label has to
    // carry the name since the icon SVG has none and the label is display:none.
    renderNav(baseProps({ isLoggedIn: true, username: 'chef' }))
    expect(screen.getByRole('link', { name: 'Recipes' })).toHaveAttribute(
      'aria-label',
      'Recipes'
    )
    expect(screen.getByRole('link', { name: 'Create Recipe' })).toHaveAttribute(
      'aria-label',
      'Create Recipe'
    )
  })
})

describe('DesktopNav routes', () => {
  it('points the primary links at the right routes', () => {
    renderNav(baseProps({ isLoggedIn: true, username: 'chef' }))
    expect(screen.getByRole('link', { name: 'Recipes' })).toHaveAttribute(
      'href',
      '/recipes'
    )
    expect(screen.getByRole('link', { name: 'Create Recipe' })).toHaveAttribute(
      'href',
      '/add-recipe'
    )
    expect(screen.getByRole('link', { name: 'Saved recipes' })).toHaveAttribute(
      'href',
      '/account/saved-recipes'
    )
  })

  it('points the logged-out CTAs at login/signup', () => {
    renderNav(baseProps({ isLoggedIn: false }))
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login'
    )
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup'
    )
  })
})

describe('DesktopAccountMenu (Profile Card)', () => {
  const renderLoggedIn = (overrides: Partial<DesktopNavProps> = {}) =>
    renderNav(
      baseProps({
        isLoggedIn: true,
        username: 'chef',
        email: 'chef@x.com',
        ...overrides,
      })
    )

  const open = () => {
    const btn = screen.getByRole('button', { name: 'Account menu' })
    fireEvent.click(btn)
    return btn
  }

  it('is a disclosure: trigger controls a panel and toggles aria-expanded', () => {
    renderLoggedIn()
    const btn = screen.getByRole('button', { name: 'Account menu' })
    expect(btn).toHaveAttribute('aria-haspopup', 'true')
    expect(btn).toHaveAttribute('aria-controls')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('exposes all account actions as links + a logout button', () => {
    renderLoggedIn()
    open()
    expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account'
    )
    expect(screen.getByRole('link', { name: 'Your recipes' })).toHaveAttribute(
      'href',
      '/account/your-recipes'
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings'
    )
    expect(screen.getByRole('link', { name: 'Help' })).toHaveAttribute(
      'href',
      '/help'
    )
    expect(
      screen.getByRole('button', { name: /log out/i })
    ).toBeInTheDocument()
  })

  it('shows the profile header (name + email) in the dropdown', () => {
    renderLoggedIn()
    open()
    expect(screen.getByText('chef')).toBeInTheDocument()
    expect(screen.getByText('chef@x.com')).toBeInTheDocument()
  })

  it('falls back to "Your account" and hides email when those are empty', () => {
    renderLoggedIn({ username: '', email: '' })
    open()
    expect(screen.getByText('Your account')).toBeInTheDocument()
    expect(screen.queryByText('chef@x.com')).not.toBeInTheDocument()
  })

  it('logs out from the menu', () => {
    const logout = vi.fn()
    renderLoggedIn({ logout })
    open()
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('closes when a menu link is clicked', () => {
    renderLoggedIn()
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on Escape and returns focus to the trigger', () => {
    renderLoggedIn()
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveFocus()
  })

  it('closes on outside click', () => {
    renderLoggedIn()
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.mouseDown(document.body)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the photo avatar, falling back to the default avatar on load error', () => {
    renderLoggedIn({ photoURL: 'https://x.test/p.png' })
    const imgs = screen.getAllByAltText('Profile')
    expect(imgs.length).toBeGreaterThan(0)

    fireEvent.error(imgs[0])
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument()
    // Image error → the default (food line-icon) avatar takes over.
    expect(document.querySelectorAll('.default-avatar').length).toBeGreaterThan(0)
  })
})

describe('useScrolled', () => {
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', {
      value: 0,
      configurable: true,
      writable: true,
    })
  })

  it('flips true once scrolled past the threshold', () => {
    const { result } = renderHook(() => useScrolled(10))
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'scrollY', {
        value: 50,
        configurable: true,
        writable: true,
      })
      window.dispatchEvent(new Event('scroll'))
    })
    expect(result.current).toBe(true)
  })
})
