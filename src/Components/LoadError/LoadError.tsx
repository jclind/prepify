import React, { FC, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import {
  API_UNREACHABLE_MESSAGE,
  OFFLINE_MESSAGE,
  isUnreachableError,
} from 'src/api/http-common'
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

const MESSAGES: Record<LoadErrorKind, { full: string; compact: string }> = {
  offline: { full: OFFLINE_MESSAGE, compact: 'You appear to be offline.' },
  unreachable: { full: API_UNREACHABLE_MESSAGE, compact: 'Couldn’t reach Prepify.' },
  server: {
    full: 'Couldn’t load recipes. Something went wrong on our end.',
    compact: 'Couldn’t load recipes.',
  },
}

interface LoadErrorProps {
  error: unknown
  /** Short copy for tight spots, like the home page's meal cards. */
  compact?: boolean
  className?: string
}

// Inline error for a section whose query failed. It says why (offline, can't
// reach the server, or the server failed) and offers a retry. One outage
// usually fails several queries at once, so Try again refetches every failed
// query, not only this section's.
const LoadError: FC<LoadErrorProps> = ({ error, compact = false, className }) => {
  const queryClient = useQueryClient()
  const [retrying, setRetrying] = useState(false)
  const kind = loadErrorKind(error)

  const retry = () => {
    setRetrying(true)
    queryClient
      .refetchQueries({ predicate: q => q.state.status === 'error' })
      .finally(() => setRetrying(false))
  }

  return (
    <div
      className={`load-error ${compact ? 'load-error--compact' : ''} ${className ?? ''}`.trim()}
    >
      <p className='load-error__msg'>{MESSAGES[kind][compact ? 'compact' : 'full']}</p>
      <button
        type='button'
        className={`btn btn--sm ${compact ? 'btn--ghost' : 'btn--outline'}`}
        onClick={retry}
        disabled={retrying}
      >
        {retrying ? 'Retrying…' : 'Try again'}
      </button>
    </div>
  )
}

export default LoadError
