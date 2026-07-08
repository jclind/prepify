/**
 * Admin Ingredients (enrichment telemetry) page: renders `miss` and
 * `price_outlier` rows from AdminAPI.listIngredientMisses and filters by type.
 * The API is mocked; react-query/router are real.
 */

import React from 'react'
import { vi, Mock } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Ingredients from 'src/pages/Admin/Ingredients/Ingredients'
import AdminAPI from 'src/api/admin'

vi.mock('src/api/admin', () => ({
  __esModule: true,
  default: { listIngredientMisses: vi.fn() },
}))

const mockedList = AdminAPI.listIngredientMisses as unknown as Mock

const missItem = {
  _id: 'miss:1 cup zzqx',
  type: 'miss' as const,
  normalized: '1 cup zzqx',
  raw: '1 cup zzqx, fresh',
  count: 4,
  firstSeen: new Date('2026-06-01T12:00:00Z').toISOString(),
  lastSeen: new Date('2026-06-02T12:00:00Z').toISOString(),
}

const outlierItem = {
  _id: 'price_outlier:1 cup strawberries',
  type: 'price_outlier' as const,
  normalized: '1 cup strawberries',
  raw: '1 cup strawberries',
  name: 'strawberries',
  priceCents: 2534,
  count: 2,
  firstSeen: new Date('2026-06-01T12:00:00Z').toISOString(),
  lastSeen: new Date('2026-06-02T12:00:00Z').toISOString(),
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <Ingredients />
      </MemoryRouter>
    </QueryClientProvider>
  )

afterEach(() => vi.clearAllMocks())

describe('Admin Ingredients telemetry page', () => {
  it('renders a miss row and a price-outlier row with its formatted price', async () => {
    mockedList.mockResolvedValue({ items: [outlierItem, missItem], totalCount: 2 })
    renderPage()

    expect(await screen.findByText('1 cup strawberries')).toBeInTheDocument()
    expect(screen.getByText('1 cup zzqx, fresh')).toBeInTheDocument()
    // The outlier's matched name + formatted price ($25.34 from 2534 cents).
    expect(screen.getByText('strawberries')).toBeInTheDocument()
    expect(screen.getByText('$25.34')).toBeInTheDocument()
    // Occurrence counts render as ×N.
    expect(screen.getByText('×4')).toBeInTheDocument()
  })

  it('filters by type and refetches', async () => {
    mockedList.mockResolvedValue({ items: [outlierItem], totalCount: 1 })
    renderPage()
    await screen.findByText('1 cup strawberries')

    fireEvent.click(screen.getByRole('button', { name: 'Price outliers' }))

    await waitFor(() =>
      expect(mockedList).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'price_outlier', page: 1 })
      )
    )
  })

  it('shows an empty state when there is no telemetry', async () => {
    mockedList.mockResolvedValue({ items: [], totalCount: 0 })
    renderPage()
    expect(
      await screen.findByText(/no matching ingredient telemetry/i)
    ).toBeInTheDocument()
  })
})
