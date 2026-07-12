import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import NavMenu from 'src/Components/Navbar/menu/NavMenu'
import { NavMenuProps } from 'src/Components/Navbar/menu/types'

// The in-menu search pulls in RecipeAPI + autocomplete; stub it so these tests
// focus on the menu's own structure/behavior.
vi.mock('src/Components/SearchRecipesInput/SearchRecipesInput', () => ({
  default: () => <div data-testid='search-stub' />,
}))

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const baseMenu = (
  overrides: Partial<NavMenuProps> = {}
): NavMenuProps => ({
  open: true,
  onClose: vi.fn(),
  isLoggedIn: false,
  authLoading: false,
  username: '',
  email: '',
  photoURL: null,
  logout: vi.fn(),
  ...overrides,
})

const renderMenu = (props: NavMenuProps) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <NavMenu {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  )

describe('NavMenu', () => {
  it('logged out: shows Browse + Login/Signup CTAs, hides logged-in nav', () => {
    renderMenu(baseMenu({ isLoggedIn: false }))

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Recipes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument()

    expect(
      screen.queryByRole('link', { name: 'Create Recipe' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Account' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /log out/i })
    ).not.toBeInTheDocument()
  })

  it('logged in: shows all groups, account identity, and logout (no CTAs)', () => {
    renderMenu(
      baseMenu({
        isLoggedIn: true,
        username: 'chef',
        email: 'chef@example.com',
      })
    )

    expect(screen.getByRole('link', { name: 'Create Recipe' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Help' })).toBeInTheDocument()
    expect(screen.getByText('chef')).toBeInTheDocument()
    expect(screen.getByText('chef@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('calls onClose when a nav link is clicked', () => {
    const onClose = vi.fn()
    renderMenu(baseMenu({ onClose }))
    fireEvent.click(screen.getByRole('link', { name: 'Recipes' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    renderMenu(baseMenu({ onClose }))
    // keydown bubbles from the dialog up to the window listener
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('logout button closes the menu and logs out', () => {
    const onClose = vi.fn()
    const logout = vi.fn()
    renderMenu(baseMenu({ isLoggedIn: true, onClose, logout }))
    fireEvent.click(screen.getByRole('button', { name: /log out/i }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(logout).toHaveBeenCalledTimes(1)
  })
})
