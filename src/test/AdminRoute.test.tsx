/**
 * AdminRoute gate. useAuth is mocked so we can drive each access state directly
 * without standing up a real Firebase-backed AuthProvider. The route renders an
 * Outlet only for a logged-in admin; everyone else is redirected home, and the
 * pre-resolution (authLoading) window renders nothing so a real admin isn't
 * bounced on refresh before the claim loads.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import AdminRoute from 'src/Components/AdminRoute'
import { useAuth } from 'src/context/AuthContext'

vi.mock('src/context/AuthContext', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = useAuth as unknown as Mock

const renderAt = () =>
  render(
    <MemoryRouter initialEntries={['/admin/reports']}>
      <Routes>
        <Route path='/admin' element={<AdminRoute />}>
          <Route path='reports' element={<div>ADMIN CONTENT</div>} />
        </Route>
        <Route path='/' element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>
  )

afterEach(() => {
  mockedUseAuth.mockReset()
})

describe('AdminRoute', () => {
  it('renders the protected content for a logged-in admin', () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' }, isAdmin: true, authLoading: false })
    renderAt()
    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument()
    expect(screen.queryByText('HOME')).not.toBeInTheDocument()
  })

  it('redirects a logged-in non-admin home', () => {
    mockedUseAuth.mockReturnValue({ user: { uid: 'u1' }, isAdmin: false, authLoading: false })
    renderAt()
    expect(screen.getByText('HOME')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument()
  })

  it('redirects a logged-out visitor home', () => {
    mockedUseAuth.mockReturnValue({ user: null, isAdmin: false, authLoading: false })
    renderAt()
    expect(screen.getByText('HOME')).toBeInTheDocument()
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument()
  })

  it('renders nothing while auth is still loading (no premature redirect)', () => {
    mockedUseAuth.mockReturnValue({ user: null, isAdmin: false, authLoading: true })
    renderAt()
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument()
    expect(screen.queryByText('HOME')).not.toBeInTheDocument()
  })
})
