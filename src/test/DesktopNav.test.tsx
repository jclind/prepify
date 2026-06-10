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
  nameInitial: '',
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
      baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' })
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
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    expect(
      screen.getByRole('navigation', { name: 'Primary' })
    ).toBeInTheDocument()
  })
})

describe('DesktopAccountMenu (Profile Card)', () => {
  const renderLoggedIn = (overrides: Partial<DesktopNavProps> = {}) =>
    renderNav(
      baseProps({
        isLoggedIn: true,
        username: 'chef',
        email: 'chef@x.com',
        nameInitial: 'C',
        ...overrides,
      })
    )

  const open = () => {
    const btn = screen.getByRole('button', { name: 'Account menu' })
    fireEvent.click(btn)
    return btn
  }

  it('toggles open/closed and exposes aria-expanded', () => {
    renderLoggedIn()
    const btn = screen.getByRole('button', { name: 'Account menu' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('exposes all account actions as menuitems', () => {
    renderLoggedIn()
    open()
    expect(screen.getByRole('menuitem', { name: 'Account' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Your recipes' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'Settings' })
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /log out/i })
    ).toBeInTheDocument()
  })

  it('shows the profile header (name + email) in the dropdown', () => {
    renderLoggedIn()
    open()
    expect(screen.getByText('chef')).toBeInTheDocument()
    expect(screen.getByText('chef@x.com')).toBeInTheDocument()
  })

  it('falls back to "Your account" when no username is present', () => {
    renderLoggedIn({ username: '' })
    open()
    expect(screen.getByText('Your account')).toBeInTheDocument()
  })

  it('logs out from the menu', () => {
    const logout = vi.fn()
    renderLoggedIn({ logout })
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    renderLoggedIn()
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes on outside click', () => {
    renderLoggedIn()
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.mouseDown(document.body)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders the initial avatar when there is no photo', () => {
    renderLoggedIn({ photoURL: null, nameInitial: 'C' })
    // initial appears on the trigger avatar + the dropdown profile avatar
    expect(screen.getAllByText('C').length).toBeGreaterThan(0)
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
