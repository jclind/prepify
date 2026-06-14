import React, { FC, useEffect, useState } from 'react'
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AdminBugReportType, BugReportStatus, BugReportCategory } from 'types'
import BugReportAPI from 'src/api/bugReports'
import SavedFilterBar from 'src/Components/SavedFilters/SavedFilterBar'
import './BugReports.scss'

type StatusFilter = BugReportStatus | 'all'
type CategoryFilter = BugReportCategory | 'all'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
]

const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All categories' },
  { value: 'bug', label: 'Bug' },
  { value: 'confusing', label: 'Confusing' },
  { value: 'idea', label: 'Idea' },
  { value: 'other', label: 'Other' },
]

// Server caps perPage at 100; 50 keeps each page light while still showing a
// useful chunk. Pagination below lets admins reach reports beyond the first page.
const PER_PAGE = 50

const BugReports: FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [page, setPage] = useState(0)
  // Ids ticked for a bulk resolve/dismiss sweep. Only open reports are
  // selectable; changing any filter clears the selection.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-bug-reports', statusFilter, categoryFilter, page],
    queryFn: () =>
      BugReportAPI.listBugReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        page,
        perPage: PER_PAGE,
      }),
    // Keep the current page visible while the next one loads, so paging doesn't
    // flash the empty/loading state.
    placeholderData: keepPreviousData,
  })

  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE))

  // If reports drain off the last page (e.g. the admin resolved the only item on
  // it), step back so they aren't stranded on an empty page.
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1)
  }, [page, totalPages])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-bug-reports'] })

  const changeTab = (value: StatusFilter) => {
    setStatusFilter(value)
    setPage(0)
    setSelected(new Set())
  }

  const changeCategory = (value: CategoryFilter) => {
    setCategoryFilter(value)
    setPage(0)
    setSelected(new Set())
  }

  const toggleSelect = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const openReports = (data?.reports || []).filter(r => r.status === 'open')
  const allOpenSelected =
    openReports.length > 0 && openReports.every(r => selected.has(r._id))

  const toggleSelectAll = () =>
    setSelected(
      allOpenSelected ? new Set() : new Set(openReports.map(r => r._id))
    )

  const bulkMutation = useMutation({
    mutationFn: ({ status }: { status: 'resolved' | 'dismissed' }) =>
      BugReportAPI.bulkResolve(Array.from(selected), status),
    onSuccess: (res, vars) => {
      toast.success(`${res.updated} report${res.updated === 1 ? '' : 's'} ${vars.status}.`)
      setSelected(new Set())
      invalidate()
    },
    onError: () => toast.error('Could not update the selected reports.'),
  })

  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) =>
      BugReportAPI.resolveBugReport(id, status),
    onSuccess: (_d, vars) => {
      toast.success(`Report ${vars.status}.`)
      invalidate()
    },
    onError: () => toast.error('Could not update the report.'),
  })

  const busy = resolveMutation.isPending || bulkMutation.isPending

  const reporterLabel = (report: AdminBugReportType) => {
    if (report.reporterUsername) return `@${report.reporterUsername}`
    if (report.reporterEmail) return report.reporterEmail
    return 'Anonymous'
  }

  return (
    <div className='admin-bug-reports'>
      <header className='admin-bug-reports-head'>
        <h1>Bug reports</h1>
        {data && <span className='open-count'>{data.openCount} open</span>}
      </header>

      <div className='status-tabs'>
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            className={statusFilter === tab.value ? 'tab active' : 'tab'}
            onClick={() => changeTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
        <select
          className='category-select'
          value={categoryFilter}
          onChange={e => changeCategory(e.target.value as CategoryFilter)}
          aria-label='Filter by category'
        >
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <SavedFilterBar<{ status: StatusFilter; category: CategoryFilter }>
        page='bug-reports'
        current={{ status: statusFilter, category: categoryFilter }}
        onApply={f => {
          setStatusFilter(f.status)
          setCategoryFilter(f.category)
          setPage(0)
          setSelected(new Set())
        }}
      />

      {openReports.length > 0 && (
        <div className='bulk-bar'>
          <label className='bulk-select-all'>
            <input
              type='checkbox'
              checked={allOpenSelected}
              onChange={toggleSelectAll}
            />
            {selected.size > 0
              ? `${selected.size} selected`
              : `Select all ${openReports.length} open${
                  totalPages > 1 ? ' on this page' : ''
                }`}
          </label>
          {selected.size > 0 && (
            <div className='bulk-actions'>
              <button
                className='action resolve'
                disabled={busy}
                onClick={() => bulkMutation.mutate({ status: 'resolved' })}
              >
                Resolve selected
              </button>
              <button
                className='action dismiss'
                disabled={busy}
                onClick={() => bulkMutation.mutate({ status: 'dismissed' })}
              >
                Dismiss selected
              </button>
            </div>
          )}
        </div>
      )}

      {isPending ? (
        <p className='bug-reports-state'>Loading bug reports…</p>
      ) : isError ? (
        <p className='bug-reports-state error'>Failed to load bug reports.</p>
      ) : data.reports.length === 0 ? (
        <p className='bug-reports-state'>
          No {statusFilter === 'all' ? '' : statusFilter} bug reports.
        </p>
      ) : (
        <ul className='bug-reports-list'>
          {data.reports.map(report => (
            <li key={report._id} className='bug-report-card'>
              {report.status === 'open' && (
                <input
                  type='checkbox'
                  className='bug-report-select'
                  checked={selected.has(report._id)}
                  onChange={() => toggleSelect(report._id)}
                  aria-label='Select report for bulk action'
                />
              )}
              <div className='bug-report-main'>
                <div className='bug-report-tags'>
                  <span className={`category-pill ${report.category}`}>
                    {report.category}
                  </span>
                  <span className={`status-pill ${report.status}`}>
                    {report.status}
                  </span>
                </div>

                <p className='bug-report-description'>{report.description}</p>

                <p className='bug-report-context'>
                  {report.url && <span className='ctx'>{report.url}</span>}
                  {report.appVersion && (
                    <span className='ctx'>v{report.appVersion}</span>
                  )}
                  <span className='ctx'>{reporterLabel(report)}</span>
                </p>
                {report.userAgent && (
                  <p className='bug-report-ua' title={report.userAgent}>
                    {report.userAgent}
                  </p>
                )}
                <p className='bug-report-foot'>
                  Submitted {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>

              {report.status === 'open' && (
                <div className='bug-report-actions'>
                  <button
                    className='action resolve'
                    disabled={busy}
                    onClick={() =>
                      resolveMutation.mutate({ id: report._id, status: 'resolved' })
                    }
                  >
                    Resolve
                  </button>
                  <button
                    className='action dismiss'
                    disabled={busy}
                    onClick={() =>
                      resolveMutation.mutate({ id: report._id, status: 'dismissed' })
                    }
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && !isError && totalCount > 0 && totalPages > 1 && (
        <div className='bug-reports-pagination'>
          <span className='page-info'>
            Showing {page * PER_PAGE + 1}–
            {Math.min((page + 1) * PER_PAGE, totalCount)} of {totalCount}
          </span>
          <div className='page-controls'>
            <button
              className='page-btn'
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
            >
              Previous
            </button>
            <span className='page-indicator'>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className='page-btn'
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default BugReports
