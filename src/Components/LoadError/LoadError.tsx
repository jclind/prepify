import React, { FC, ReactNode, useEffect, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { isUnreachableError } from 'src/api/http-common'
import { CloudOffIcon, RotateCwIcon, WifiOffIcon } from 'src/Components/icons'
import './LoadError.scss'

type LoadErrorKind = 'offline' | 'unreachable' | 'server'

// Same test the unreachable toast uses, so the inline message and the toast
// never disagree. Only an axios error counts as "unreachable": a plain Error
// (a bug in our own code) has no response either, but the network is fine.
export function loadErrorKind(error: unknown): LoadErrorKind {
  if (!axios.isAxiosError(error) || !isUnreachableError(error)) return 'server'
  return typeof navigator !== 'undefined' && navigator.onLine === false
    ? 'offline'
    : 'unreachable'
}

const COPY: Record<LoadErrorKind, { title: string; detail: string }> = {
  offline: { title: 'You’re offline', detail: 'Recipes will load once you reconnect.' },
  unreachable: {
    title: 'Can’t reach Prepify',
    detail: 'Check your connection, or try a different network.',
  },
  server: { title: 'Recipes didn’t load', detail: 'Something went wrong on our end.' },
}

interface LoadErrorProps {
  /** The query's error; null while a retry after it is running. */
  error: unknown
  /** The section's query is refetching: the button spins and ignores clicks. */
  retrying?: boolean
  /**
   * What Try again does. Default: refetch every failed query. /recipes passes
   * fetchNextPage when the failure was loading another page, since a refetch
   * would only reload the pages it already has.
   */
  onRetry?: () => void
  /** Title only, for tight spots like the home page's meal cards. */
  compact?: boolean
  /**
   * The section's loading skeleton. It's rendered invisibly under the message
   * so the error takes exactly the height the loaded content would, at every
   * screen width, and nothing jumps when a retry fills it in.
   */
  ghost: ReactNode
  className?: string
}

interface QueryOutcome {
  status: 'pending' | 'error' | 'success'
  errorUpdateCount: number
  fetchStatus: 'fetching' | 'paused' | 'idle'
}

/**
 * Whether a section should show its error tray, and whether a fetch is running.
 *
 * Refetching a query that has no data resets it to `pending` with no error, so
 * a section would swap its tray for the skeleton mid-retry, unmounting the Try
 * again button a keyboard user has focused. A query that is pending but has
 * failed before is that retry, so it keeps the tray, including a retry paused
 * because the browser is offline. A query with data stays `error` during its
 * retry anyway. Both come from React Query's per-key state, so a new /recipes
 * sort or filter starts clean, and no clock is involved.
 */
export function loadErrorView(q: QueryOutcome): { failed: boolean; retrying: boolean } {
  return {
    failed: q.status === 'error' || (q.status === 'pending' && q.errorUpdateCount > 0),
    retrying: q.fetchStatus !== 'idle',
  }
}

// Inline error for a section whose query failed: a dashed tray where the
// recipes would be, saying why (offline, can't reach the server, or the server
// failed) with a retry. One outage usually fails several queries at once, so
// Try again refetches every failed query, not only this section's.
const LoadError: FC<LoadErrorProps> = ({
  error,
  retrying = false,
  onRetry,
  compact = false,
  ghost,
  className,
}) => {
  const queryClient = useQueryClient()
  // A retry clears the query's `error` while it runs, so keep the last one to
  // hold the copy steady. A tray first mounted mid-retry has none yet and shows
  // the generic message.
  const [lastError, setLastError] = useState<unknown>(error)
  useEffect(() => {
    if (error) setLastError(error)
  }, [error])
  const kind = loadErrorKind(error ?? lastError)
  const { title, detail } = COPY[kind]
  const Icon = kind === 'offline' ? WifiOffIcon : CloudOffIcon

  const retry = () => {
    if (retrying) return
    if (onRetry) onRetry()
    else void queryClient.refetchQueries({ predicate: q => q.state.status === 'error' })
  }

  return (
    <div
      className={`load-error ${compact ? 'load-error--compact' : ''} ${className ?? ''}`.trim()}
    >
      <div className='load-error__ghost' aria-hidden='true'>
        {ghost}
      </div>
      <div className='load-error__tray'>
        <Icon className='load-error__icon' aria-hidden='true' />
        <p className='load-error__title'>{title}</p>
        {compact ? null : <p className='load-error__detail'>{detail}</p>}
        {/* aria-disabled, not disabled: disabling the focused button would
            drop keyboard focus, the thing the retained error exists to keep. */}
        <button
          type='button'
          className={`load-error__retry btn btn--sm ${compact ? 'btn--ghost' : 'btn--outline'}`}
          onClick={retry}
          aria-disabled={retrying}
        >
          <RotateCwIcon aria-hidden='true' className={retrying ? 'spin' : ''} />
          {retrying ? 'Retrying' : 'Try again'}
        </button>
      </div>
    </div>
  )
}

export default LoadError
