import React, { FC, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuditAction, AuditEntryType, AuditTargetType } from 'types'
import AdminAPI from 'src/api/admin'
import { ACTION_META, formatAuditActor, isSelfAction } from 'src/pages/Admin/auditMeta'
import SavedFilterBar from 'src/Components/SavedFilters/SavedFilterBar'
import './Audit.scss'

type AuditFilter = {
  action: AuditAction | 'all'
  targetType: AuditTargetType | 'all'
}

const PER_PAGE = 25

// Filter chips for the action column. `all` clears the filter.
const ACTION_FILTERS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'recipe.hide', label: 'Recipe hidden' },
  { value: 'recipe.unhide', label: 'Recipe restored' },
  { value: 'recipe.unpublish', label: 'Recipe unpublished' },
  { value: 'recipe.publish', label: 'Recipe published' },
  { value: 'recipe.feature', label: 'Recipe featured' },
  { value: 'recipe.unfeature', label: 'Recipe unfeatured' },
  { value: 'review.takedown', label: 'Review taken down' },
  { value: 'review.restore', label: 'Review restored' },
  { value: 'user.suspend', label: 'User suspended' },
  { value: 'user.ban', label: 'User banned' },
  { value: 'user.activate', label: 'User reactivated' },
  { value: 'report.resolve', label: 'Report resolved' },
  { value: 'report.dismiss', label: 'Report dismissed' },
  { value: 'recipe.autohold', label: 'Recipe auto-held (auto)' },
  { value: 'content.blocked', label: 'Content blocked (auto)' },
]

const TARGET_TABS: { value: AuditTargetType | 'all'; label: string }[] = [
  { value: 'all', label: 'All targets' },
  { value: 'recipe', label: 'Recipes' },
  { value: 'review', label: 'Reviews' },
  { value: 'user', label: 'Users' },
  { value: 'report', label: 'Reports' },
]

const Audit: FC = () => {
  const [action, setAction] = useState<AuditAction | 'all'>('all')
  const [targetType, setTargetType] = useState<AuditTargetType | 'all'>('all')
  const [page, setPage] = useState(1)

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-audit', action, targetType, page],
    queryFn: () =>
      AdminAPI.listAudit({
        action: action === 'all' ? undefined : action,
        targetType: targetType === 'all' ? undefined : targetType,
        page,
        perPage: PER_PAGE,
      }),
  })

  const totalPages = data ? Math.max(Math.ceil(data.totalCount / PER_PAGE), 1) : 1

  const resetTo = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  const applyPreset = (f: AuditFilter) => {
    setAction(f.action)
    setTargetType(f.targetType)
    setPage(1)
  }

  return (
    <div className='admin-audit'>
      <header className='admin-audit-head'>
        <h1>Audit log</h1>
        {data && <span className='total-count'>{data.totalCount} entries</span>}
      </header>

      <div className='audit-filters'>
        <select
          className='action-select'
          value={action}
          onChange={e => resetTo(setAction)(e.target.value as AuditAction | 'all')}
          aria-label='Filter by action'
        >
          {ACTION_FILTERS.map(f => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <div className='target-tabs'>
          {TARGET_TABS.map(tab => (
            <button
              key={tab.value}
              className={targetType === tab.value ? 'tab active' : 'tab'}
              onClick={() => resetTo(setTargetType)(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <SavedFilterBar<AuditFilter>
        page='audit'
        current={{ action, targetType }}
        onApply={applyPreset}
      />

      {isPending ? (
        <p className='audit-state'>Loading audit log…</p>
      ) : isError ? (
        <p className='audit-state error'>Failed to load the audit log.</p>
      ) : data.entries.length === 0 ? (
        <p className='audit-state'>No matching audit entries.</p>
      ) : (
        <>
          <ul className='audit-list'>
            {data.entries.map((entry: AuditEntryType) => {
              const meta = ACTION_META[entry.action]
              return (
                <li key={entry._id} className='audit-row'>
                  <span className={`dot ${meta?.tone || 'neutral'}`} aria-hidden='true' />
                  <div className='audit-body'>
                    <p className='audit-line'>
                      <strong className='actor'>
                        {formatAuditActor(entry)}
                      </strong>{' '}
                      {meta?.label || entry.action}
                      {!isSelfAction(entry) && (
                        <>
                          {' '}
                          <span className='target'>
                            {entry.targetLabel || entry.targetId}
                          </span>
                        </>
                      )}
                    </p>
                    {entry.reason && (
                      <p className='audit-reason'>“{entry.reason}”</p>
                    )}
                    <p className='audit-time'>
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {totalPages > 1 && (
            <div className='audit-pager'>
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

export default Audit
