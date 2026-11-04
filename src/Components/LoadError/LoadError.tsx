import React, { FC, ReactNode, useRef } from 'react'
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
  error: unknown
  /** The section's query is refetching: the button spins and ignores clicks. */
  retrying?: boolean
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

/**
 * Each query's error, kept while a refetch after that error is in flight.
 *
 * Refetching a query that has no data resets it to loading, so a section would
 * swap its tray for the skeleton mid-retry. That unmounts the focused Try again
 * button, and keyboard focus falls to <body>. Holding the last error until the
 * refetch settles keeps the tray (and the focus) in place: it clears when the
 * retry succeeds and is replaced when it fails again.
 */
export function useRetainedErrors(
  queries: ReadonlyArray<{ error: unknown; isFetching: boolean }>
): unknown[] {
  const last = useRef<unknown[]>([])
  last.current = queries.map(
    (q, i) => q.error ?? (q.isFetching ? last.current[i] ?? null : null)
  )
  return last.current
}

// Inline error for a section whose query failed: a dashed tray where the
// recipes would be, saying why (offline, can't reach the server, or the server
// failed) with a retry. One outage usually fails several queries at once, so
// Try again refetches every failed query, not only this section's.
const LoadError: FC<LoadErrorProps> = ({
  error,
  retrying = false,
  compact = false,
  ghost,
  className,
}) => {
  const queryClient = useQueryClient()
  const kind = loadErrorKind(error)
  const { title, detail } = COPY[kind]
  const Icon = kind === 'offline' ? WifiOffIcon : CloudOffIcon

  const retry = () => {
    if (retrying) return
    void queryClient.refetchQueries({ predicate: q => q.state.status === 'error' })
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
