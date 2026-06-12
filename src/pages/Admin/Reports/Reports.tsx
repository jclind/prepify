import React, { FC, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AdminReportType, ReportStatus } from 'types'
import ReportAPI from 'src/api/reports'
import './Reports.scss'

type StatusFilter = ReportStatus | 'all'

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'all', label: 'All' },
]

const Reports: FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  // Ids of reports ticked for a bulk resolve/dismiss sweep. Only open reports
  // are selectable; switching tabs clears the selection.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-reports', statusFilter],
    queryFn: () =>
      ReportAPI.listReports({
        status: statusFilter === 'all' ? undefined : statusFilter,
        perPage: 50,
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-reports'] })

  const changeTab = (value: StatusFilter) => {
    setStatusFilter(value)
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

  // Resolve/dismiss every selected report in one request.
  const bulkMutation = useMutation({
    mutationFn: ({ status }: { status: 'resolved' | 'dismissed' }) =>
      ReportAPI.bulkResolve(Array.from(selected), status),
    onSuccess: (res, vars) => {
      toast.success(`${res.updated} report${res.updated === 1 ? '' : 's'} ${vars.status}.`)
      setSelected(new Set())
      invalidate()
    },
    onError: () => toast.error('Could not update the selected reports.'),
  })

  // Resolve / dismiss a report (does not itself change the content).
  const resolveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'resolved' | 'dismissed' }) =>
      ReportAPI.resolveReport(id, status),
    onSuccess: (_d, vars) => {
      toast.success(`Report ${vars.status}.`)
      invalidate()
    },
    onError: () => toast.error('Could not update the report.'),
  })

  // Take the reported content down, then close the report as resolved.
  const takedownMutation = useMutation({
    mutationFn: async (report: AdminReportType) => {
      if (report.targetType === 'recipe') {
        await ReportAPI.setRecipeModeration(report.recipeId, 'hidden')
      } else if (report.reportedUsername) {
        await ReportAPI.setReviewModeration(
          report.recipeId,
          report.reportedUsername,
          true
        )
      }
      await ReportAPI.resolveReport(report._id, 'resolved')
    },
    onSuccess: () => {
      toast.success('Content taken down and report resolved.')
      invalidate()
    },
    onError: () => toast.error('Could not take the content down.'),
  })

  // Bring previously-hidden content back. Leaves the report's status as-is.
  const restoreMutation = useMutation({
    mutationFn: async (report: AdminReportType) => {
      if (report.targetType === 'recipe') {
        await ReportAPI.setRecipeModeration(report.recipeId, 'active')
      } else if (report.reportedUsername) {
        await ReportAPI.setReviewModeration(
          report.recipeId,
          report.reportedUsername,
          false
        )
      }
    },
    onSuccess: () => {
      toast.success('Content restored.')
      invalidate()
    },
    onError: () => toast.error('Could not restore the content.'),
  })

  // Whether the reported target is currently hidden (from the queue's snapshot).
  const isTargetHidden = (report: AdminReportType) =>
    report.targetType === 'recipe'
      ? report.target.recipe?.status === 'hidden'
      : report.target.review?.moderationHidden === true

  const busy =
    resolveMutation.isPending ||
    takedownMutation.isPending ||
    restoreMutation.isPending ||
    bulkMutation.isPending

  const renderPreview = (report: AdminReportType) => {
    const { target } = report
    if (report.targetType === 'recipe') {
      if (!target.recipe) {
        return <span className='preview-missing'>Recipe no longer exists.</span>
      }
      return (
        <div className='preview recipe-preview'>
          {target.recipe.recipeImage && (
            <img src={target.recipe.recipeImage} alt='' className='preview-thumb' />
          )}
          <div className='preview-body'>
            <Link to={`/recipes/${report.recipeId}`} className='preview-title'>
              {target.recipe.title || 'Untitled recipe'}
            </Link>
            {target.recipe.status === 'hidden' && (
              <span className='hidden-pill'>Hidden</span>
            )}
          </div>
        </div>
      )
    }
    // review
    if (!target.review) {
      return <span className='preview-missing'>Review no longer exists.</span>
    }
    return (
      <div className='preview review-preview'>
        <div className='preview-body'>
          <div className='preview-meta'>
            Review by <strong>@{report.reportedUsername}</strong> on{' '}
            <Link to={`/recipes/${report.recipeId}`}>this recipe</Link>
            {target.review.moderationHidden && (
              <span className='hidden-pill'>Hidden</span>
            )}
          </div>
          <blockquote className='preview-text'>
            “{target.review.reviewText || '(no text)'}”
          </blockquote>
        </div>
      </div>
    )
  }

  return (
    <div className='admin-reports'>
      <header className='admin-reports-head'>
        <h1>Reports</h1>
        {data && (
          <span className='open-count'>{data.openCount} open</span>
        )}
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
      </div>

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
              : `Select all ${openReports.length} open`}
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
        <p className='reports-state'>Loading reports…</p>
      ) : isError ? (
        <p className='reports-state error'>Failed to load reports.</p>
      ) : data.reports.length === 0 ? (
        <p className='reports-state'>No {statusFilter === 'all' ? '' : statusFilter} reports.</p>
      ) : (
        <ul className='reports-list'>
          {data.reports.map(report => (
            <li key={report._id} className='report-card'>
              {report.status === 'open' && (
                <input
                  type='checkbox'
                  className='report-select'
                  checked={selected.has(report._id)}
                  onChange={() => toggleSelect(report._id)}
                  aria-label='Select report for bulk action'
                />
              )}
              <div className='report-main'>
                <div className='report-tags'>
                  <span className={`type-pill ${report.targetType}`}>
                    {report.targetType}
                  </span>
                  <span className='reason-pill'>{report.reason}</span>
                  <span className={`status-pill ${report.status}`}>
                    {report.status}
                  </span>
                </div>

                {renderPreview(report)}

                {report.details && (
                  <p className='report-details'>“{report.details}”</p>
                )}
                <p className='report-foot'>
                  Reported {new Date(report.createdAt).toLocaleString()}
                </p>
              </div>

              {(report.status === 'open' || isTargetHidden(report)) && (
                <div className='report-actions'>
                  {isTargetHidden(report) ? (
                    <button
                      className='action restore'
                      disabled={busy}
                      onClick={() => restoreMutation.mutate(report)}
                    >
                      Restore
                    </button>
                  ) : (
                    report.status === 'open' && (
                      <button
                        className='action takedown'
                        disabled={busy}
                        onClick={() => takedownMutation.mutate(report)}
                      >
                        Take down
                      </button>
                    )
                  )}
                  {report.status === 'open' && (
                    <>
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
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Reports
