/**
 * AccountStatusBanner: the persistent site-wide notice for a suspended/banned
 * user. Self-gates — nothing for logged-out or active accounts — and shows the
 * status + reason otherwise. useAuth + AuthAPI are mocked; react-query is real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountStatusBanner from 'src/Components/AccountStatusBanner/AccountStatusBanner'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('src/api/auth', () => ({
  __esModule: true,
  default: { getAccountStatus: vi.fn() },
}))

const mockedUseAuth = useAuth as unknown as Mock
const mockedGetStatus = AuthAPI.getAccountStatus as unknown as Mock

const renderBanner = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AccountStatusBanner />
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('AccountStatusBanner', () => {
  it('renders nothing for a logged-out user (no status fetch)', () => {
    mockedUseAuth.mockReturnValue({ user: null })
    const { container } = renderBanner()
    expect(container).toBeEmptyDOMElement()
    expect(mockedGetStatus).not.toHaveBeenCalled()
  })

  it('renders nothing for an active account', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockedGetStatus.mockResolvedValue({ status: 'active', statusReason: null })
    const { container } = renderBanner()
    await waitFor(() => expect(mockedGetStatus).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the suspension notice with the reason', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockedGetStatus.mockResolvedValue({ status: 'suspended', statusReason: 'spam' })
    renderBanner()
    expect(await screen.findByText(/your account is suspended/i)).toBeInTheDocument()
    expect(screen.getByText(/reason: spam/i)).toBeInTheDocument()
  })

  it('shows the banned notice', async () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' } })
    mockedGetStatus.mockResolvedValue({ status: 'banned', statusReason: null })
    renderBanner()
    expect(await screen.findByText(/your account has been banned/i)).toBeInTheDocument()
  })
})
