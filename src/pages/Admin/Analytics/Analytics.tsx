import React, { FC, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AuditEntryType, TimeBucket } from 'types'
import AdminAPI from 'src/api/admin'
import { ACTION_META, formatAuditActor } from 'src/pages/Admin/auditMeta'
import './Analytics.scss'

// Day windows offered by the toggle. Server clamps to 7–90 regardless.
const DAY_OPTIONS = [7, 30, 90]

// A dependency-free daily bar chart. Bars scale to the series max; the first and
// last dates anchor the axis. Each bar carries its value as a title for hover.
const Sparkbars: FC<{ data: TimeBucket[]; tone: string }> = ({ data, tone }) => {
  const max = data.reduce((m, b) => Math.max(m, b.count), 0)
  const total = data.reduce((sum, b) => sum + b.count, 0)
  return (
    <div className='sparkbars'>
      <div className='bars' role='img' aria-label={`${total} over ${data.length} days`}>
        {data.map(b => (
          <div
            key={b.date}
            className={`bar ${tone}`}
            style={{ height: max ? `${Math.max((b.count / max) * 100, b.count ? 4 : 0)}%` : '0%' }}
            title={`${b.date}: ${b.count}`}
          />
        ))}
      </div>
      <div className='axis'>
        <span>{data.length ? formatShort(data[0].date) : ''}</span>
        <span>{data.length ? formatShort(data[data.length - 1].date) : ''}</span>
      </div>
    </div>
  )
}

// 'YYYY-MM-DD' → 'Mon D' without pulling in a date library.
function formatShort(date: string) {
  const d = new Date(`${date}T00:00:00Z`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const Analytics: FC = () => {
  const [days, setDays] = useState(30)

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-analytics', days],
    queryFn: () => AdminAPI.getAnalytics({ days }),
  })

  return (
    <div className='admin-analytics'>
      <header className='admin-analytics-head'>
        <h1>Overview</h1>
        <div className='range-toggle' role='group' aria-label='Time range'>
          {DAY_OPTIONS.map(d => (
            <button
              key={d}
              className={days === d ? 'range active' : 'range'}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </header>

      {isPending ? (
        <p className='analytics-state'>Loading analytics…</p>
      ) : isError ? (
        <p className='analytics-state error'>Failed to load analytics.</p>
      ) : (
        <>
          <section className='stat-cards'>
            <div className='stat-card'>
              <span className='stat-value'>{data.totals.users}</span>
              <span className='stat-label'>Users</span>
            </div>
            <div className='stat-card'>
              <span className='stat-value'>{data.totals.recipes.total}</span>
              <span className='stat-label'>Recipes</span>
              <span className='stat-sub'>
                {data.totals.recipes.featured} featured · {data.totals.recipes.hidden} hidden ·{' '}
                {data.totals.recipes.unpublished} unpublished
              </span>
            </div>
            <div className='stat-card'>
              <span className='stat-value'>{data.totals.reviews}</span>
              <span className='stat-label'>Reviews</span>
            </div>
            <div className='stat-card'>
              <span className='stat-value danger'>{data.totals.reports.open}</span>
              <span className='stat-label'>Open reports</span>
              <span className='stat-sub'>
                {data.totals.reports.resolved} resolved · {data.totals.reports.dismissed} dismissed
              </span>
            </div>
            <div className='stat-card'>
              <span className='stat-value warn'>{data.totals.moderation.autoBlocked}</span>
              <span className='stat-label'>Auto-blocked</span>
              <span className='stat-sub'>
                {data.totals.moderation.autoHeld} auto-held ·{' '}
                {data.totals.moderation.autoFlagsDismissed} flags&nbsp;dismissed
              </span>
            </div>
          </section>

          <section className='trends'>
            <div className='trend-card'>
              <h2>Reports filed</h2>
              <Sparkbars data={data.reportsOverTime} tone='danger' />
            </div>
            <div className='trend-card'>
              <h2>New recipes</h2>
              <Sparkbars data={data.recipesOverTime} tone='good' />
            </div>
            <div className='trend-card'>
              <h2>New signups</h2>
              <Sparkbars data={data.usersOverTime} tone='neutral' />
              <p className='trend-note'>Counts accounts created since signup timestamps began.</p>
            </div>
          </section>

          <section className='recent-actions'>
            <h2>Recent admin actions</h2>
            {data.recentActions.length === 0 ? (
              <p className='analytics-state'>No admin actions recorded yet.</p>
            ) : (
              <ul className='action-list'>
                {data.recentActions.map((entry: AuditEntryType) => {
                  const meta = ACTION_META[entry.action]
                  return (
                    <li key={entry._id} className='action-row'>
                      <span className={`dot ${meta?.tone || 'neutral'}`} aria-hidden='true' />
                      <div className='action-body'>
                        <p className='action-line'>
                          <strong className='actor'>
                            {formatAuditActor(entry)}
                          </strong>{' '}
                          {meta?.label || entry.action}{' '}
                          <span className='target'>{entry.targetLabel || entry.targetId}</span>
                        </p>
                        <p className='action-time'>
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Analytics
