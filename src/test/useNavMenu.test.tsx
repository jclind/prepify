import React, { ReactNode } from 'react'
import { vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useNavMenu } from 'src/Components/Navbar/menu/useNavMenu'
import AuthAPI from 'src/api/auth'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/api/auth', () => ({
  default: { getUID: vi.fn(), getUsername: vi.fn() },
}))
vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))

const mockGetUID = AuthAPI.getUID as ReturnType<typeof vi.fn>
const mockGetUsername = AuthAPI.getUsername as ReturnType<typeof vi.fn>
const mockUseAuth = useAuth as ReturnType<typeof vi.fn>

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)

describe('useNavMenu', () => {
  beforeEach(() => {
    mockGetUID.mockReset()
    mockGetUsername.mockReset()
    mockUseAuth.mockReset()
  })

  it('logged out: empty profile data, isLoggedIn false', () => {
    mockUseAuth.mockReturnValue({ user: null, authLoading: false, logout: vi.fn() })
    mockGetUID.mockReturnValue(null)
    mockGetUsername.mockResolvedValue(null)

    const { result } = renderHook(() => useNavMenu(), { wrapper })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.username).toBe('')
    expect(result.current.nameInitial).toBe('')
    expect(result.current.photoURL).toBeNull()
  })

  it('logged in: derives the avatar initial from the username', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'chef@example.com', photoURL: 'https://img/x.png' },
      authLoading: false,
      logout: vi.fn(),
    })
    mockGetUID.mockReturnValue('uid-1')
    mockGetUsername.mockResolvedValue('Chef')

    const { result } = renderHook(() => useNavMenu(), { wrapper })

    expect(result.current.isLoggedIn).toBe(true)
    expect(result.current.photoURL).toBe('https://img/x.png')
    await waitFor(() => expect(result.current.username).toBe('Chef'))
    expect(result.current.nameInitial).toBe('C')
  })

  it('logged in without a username: falls back to the email initial', async () => {
    mockUseAuth.mockReturnValue({
      user: { email: 'bob@example.com', photoURL: null },
      authLoading: false,
      logout: vi.fn(),
    })
    mockGetUID.mockReturnValue('uid-2')
    mockGetUsername.mockResolvedValue(null) // no username set

    const { result } = renderHook(() => useNavMenu(), { wrapper })

    await waitFor(() => expect(result.current.nameInitial).toBe('B'))
    expect(result.current.username).toBe('')
  })
})
