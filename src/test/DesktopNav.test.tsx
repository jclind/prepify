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
import DesktopNavSwitcher from 'src/Components/Navbar/desktop/DesktopNavSwitcher'
import { DESKTOP_VARIANTS } from 'src/Components/Navbar/desktop/registry'
import { DROPDOWN_VARIANTS } from 'src/Components/Navbar/desktop/dropdownRegistry'
import { setDesktopDropdown } from 'src/Components/Navbar/desktop/dropdownStore'
import { setDesktopCreateStyle } from 'src/Components/Navbar/desktop/createStore'
import { setAuthPreview } from 'src/Components/Navbar/desktop/authPreviewStore'
import { useScrolled } from 'src/Components/Navbar/desktop/useScrolled'
import { DesktopNavProps } from 'src/Components/Navbar/desktop/types'

// The search variants pull in RecipeAPI + autocomplete; stub it so these tests
// focus on the bar's own structure/behavior.
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => <div data-testid='search-stub' />,
}))

type Props = DesktopNavProps & { variantId: string }

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  variantId: 'editorial',
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

const renderNav = (props: Props) =>
  render(
    <MemoryRouter>
      <DesktopNav {...props} />
    </MemoryRouter>
  )

// Every variant shares the same markup, so the same structural contract should
// hold for all of them regardless of skin.
describe.each(DESKTOP_VARIANTS)('DesktopNav variant: $id', variant => {
  it('logged out: shows Recipes + Login/Signup CTAs, no account menu', () => {
    renderNav(baseProps({ variantId: variant.id, isLoggedIn: false }))

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

  it('logged in: shows Create Recipe + account menu, no CTAs', () => {
    renderNav(
      baseProps({
        variantId: variant.id,
        isLoggedIn: true,
        username: 'chef',
        nameInitial: 'C',
      })
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
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })
})

describe('DesktopAccountMenu (via DesktopNav)', () => {
  const open = () => {
    const btn = screen.getByRole('button', { name: 'Account menu' })
    fireEvent.click(btn)
    return btn
  }

  it('toggles open/closed and exposes aria-expanded', () => {
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    const btn = screen.getByRole('button', { name: 'Account menu' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows Account/Help/Logout when open', () => {
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    open()
    expect(screen.getByRole('menuitem', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /log out/i })
    ).toBeInTheDocument()
  })

  it('logs out from the menu', () => {
    const logout = vi.fn()
    renderNav(
      baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C', logout })
    )
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    const btn = open()
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })
})

describe('Account dropdown design variants', () => {
  afterEach(() => setDesktopDropdown('classic'))

  const openLoggedIn = () => {
    renderNav(
      baseProps({ isLoggedIn: true, username: 'chef', email: 'chef@x.com', nameInitial: 'C' })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
  }

  // Every design exposes the core actions, accessibly.
  it.each(DROPDOWN_VARIANTS)('$id: exposes Account, Help, Log out', variant => {
    setDesktopDropdown(variant.id)
    openLoggedIn()
    expect(screen.getByRole('menuitem', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Help' })).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: /log out/i })
    ).toBeInTheDocument()
  })

  it('every design exposes Your recipes + Settings', () => {
    setDesktopDropdown('classic')
    openLoggedIn()
    expect(
      screen.getByRole('menuitem', { name: 'Your recipes' })
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
  })

  it('logout still fires from a button-style design (profile)', () => {
    const logout = vi.fn()
    setDesktopDropdown('profile')
    renderNav(
      baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C', logout })
    )
    fireEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }))
    expect(logout).toHaveBeenCalledTimes(1)
  })
})

describe('Create style', () => {
  afterEach(() => setDesktopCreateStyle('promoted'))

  it('balanced vs promoted swaps the Create button skin class', () => {
    setDesktopCreateStyle('balanced')
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    expect(
      screen.getByRole('link', { name: 'Create Recipe' }).className
    ).toContain('dnav__create--balanced')
  })
})

describe('Auth preview (dev override)', () => {
  afterEach(() => setAuthPreview('auto'))

  it("'Signed in' forces the account menu even when the prop says logged out", () => {
    setAuthPreview('in')
    renderNav(baseProps({ isLoggedIn: false }))
    expect(
      screen.getByRole('button', { name: 'Account menu' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it("'Signed out' forces the CTAs even when the prop says logged in", () => {
    setAuthPreview('out')
    renderNav(baseProps({ isLoggedIn: true, username: 'chef', nameInitial: 'C' }))
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Account menu' })
    ).not.toBeInTheDocument()
  })
})

describe('useScrolled', () => {
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

describe('DesktopNavSwitcher', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renders the variant catalog in dev', () => {
    vi.stubEnv('DEV', true)
    render(
      <MemoryRouter>
        <DesktopNavSwitcher />
      </MemoryRouter>
    )
    expect(
      screen.getByRole('button', { name: /Editorial/ })
    ).toBeInTheDocument()
  })

  it('renders nothing in production', () => {
    vi.stubEnv('DEV', false)
    const { container } = render(
      <MemoryRouter>
        <DesktopNavSwitcher />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })
})
