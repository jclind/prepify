import React, { FC, useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { IngredientMissItem, IngredientMissType } from 'types'
import AdminAPI from 'src/api/admin'
import './Ingredients.scss'

type TypeFilter = IngredientMissType | 'all'

const PER_PAGE = 25

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'miss', label: 'Enrichment misses' },
  { value: 'price_outlier', label: 'Price outliers' },
]

const TYPE_LABEL: Record<IngredientMissType, string> = {
  miss: 'miss',
  price_outlier: 'price outlier',
}

const fmtPrice = (cents?: number) =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : null

// Read-only view of the `ingredientMisses` telemetry (N6): ingredient strings
// that missed enrichment, and — folded in from N1 — those that enriched to an
// implausible per-row price (the "$10 parfait" class). Sorted server-side by
// count desc so the most-frequent problems lead. No actions: this is a signal
// for seeding the proxy cache / auditing bad estimates, not a moderation queue.
const Ingredients: FC = () => {
  const [type, setType] = useState<TypeFilter>('all')
  const [page, setPage] = useState(1)

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-ingredients', type, page],
    queryFn: () =>
      AdminAPI.listIngredientMisses({
        type: type === 'all' ? undefined : type,
        page,
        perPage: PER_PAGE,
      }),
    placeholderData: keepPreviousData,
  })

  const totalPages = data ? Math.max(Math.ceil(data.totalCount / PER_PAGE), 1) : 1

  const changeType = (value: TypeFilter) => {
    setType(value)
    setPage(1)
  }

  return (
    <div className='admin-ingredients'>
      <header className='admin-ingredients-head'>
        <h1>Ingredient telemetry</h1>
        {data && <span className='total-count'>{data.totalCount} tracked</span>}
      </header>

      <p className='admin-ingredients-intro'>
        Strings that missed enrichment or enriched to an implausible price,
        captured best-effort at parse time. Most-frequent first — use it to seed
        the proxy cache or spot bad price estimates.
      </p>

      <div className='ingredients-filters'>
        <div className='type-tabs'>
          {TYPE_TABS.map(tab => (
            <button
              key={tab.value}
              className={type === tab.value ? 'tab active' : 'tab'}
              onClick={() => changeType(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isPending ? (
        <p className='ingredients-state'>Loading ingredient telemetry…</p>
      ) : isError ? (
        <p className='ingredients-state error'>
          Failed to load ingredient telemetry.
        </p>
      ) : data.items.length === 0 ? (
        <p className='ingredients-state'>No matching ingredient telemetry.</p>
      ) : (
        <>
          <ul className='ingredients-list'>
            {data.items.map((item: IngredientMissItem) => (
              <li key={item._id} className='ingredient-row'>
                <div className='ingredient-body'>
                  <p className='ingredient-line'>
                    <span className={`type-pill ${item.type}`}>
                      {TYPE_LABEL[item.type]}
                    </span>
                    <span className='ingredient-raw'>{item.raw}</span>
                  </p>
                  {item.type === 'price_outlier' && (
                    <p className='ingredient-detail'>
                      matched <strong>{item.name || '—'}</strong> at{' '}
                      <strong className='price'>{fmtPrice(item.priceCents)}</strong>
                    </p>
                  )}
                  <p className='ingredient-time'>
                    last seen {new Date(item.lastSeen).toLocaleString()}
                  </p>
                </div>
                <span className='ingredient-count' title='times seen'>
                  ×{item.count}
                </span>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className='ingredients-pager'>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Ingredients
