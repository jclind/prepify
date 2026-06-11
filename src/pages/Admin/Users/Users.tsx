import React, { FC, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AdminUserType, UserStatus } from 'types'
import AdminAPI from 'src/api/admin'
import './Users.scss'

const STATUS_OPTIONS: UserStatus[] = ['active', 'suspended', 'banned']

// One user row. Holds its own draft status + reason so edits to different rows
// don't clobber each other. Apply is disabled until the draft differs from the
// stored status (or a reason is needed).
const UserCard: FC<{
  user: AdminUserType
  onApply: (uid: string, status: UserStatus, reason: string) => void
  busy: boolean
}> = ({ user, onApply, busy }) => {
  const [status, setStatus] = useState<UserStatus>(user.status)
  const [reason, setReason] = useState(user.statusReason || '')

  const dirty = status !== user.status || (status !== 'active' && reason !== (user.statusReason || ''))

  return (
    <li className='user-card'>
      <div className='user-main'>
        <div className='user-head'>
          {user.username ? (
            <Link to={`/u/${user.username}`} className='user-name'>
              @{user.username}
            </Link>
          ) : (
            <span className='user-name no-name'>(no username)</span>
          )}
          <span className={`status-pill ${user.status}`}>{user.status}</span>
        </div>
        {user.email && <p className='user-email'>{user.email}</p>}
        <p className='user-counts'>
          {user.counts.recipes} recipes · {user.counts.reviews} reviews ·{' '}
          <span className={user.counts.openReports > 0 ? 'has-reports' : ''}>
            {user.counts.openReports} open reports
          </span>
        </p>
        {user.statusReason && (
          <p className='user-reason'>Reason: {user.statusReason}</p>
        )}
      </div>

      <div className='user-actions'>
        <select
          aria-label={`Status for ${user.username || user.uid}`}
          value={status}
          onChange={e => setStatus(e.target.value as UserStatus)}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {status !== 'active' && (
          <input
            type='text'
            className='reason-input'
            placeholder='Reason (optional)'
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        )}
        <button
          type='button'
          className='apply-btn'
          disabled={busy || !dirty}
          onClick={() => onApply(user.uid, status, reason)}
        >
          Apply
        </button>
      </div>
    </li>
  )
}

const PER_PAGE = 25

const Users: FC = () => {
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  // Live search: debounce the input into the query so typing filters as you go
  // and clearing the box restores the full list (no separate "reset" needed).
  // Any query change resets to the first page.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(input.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(id)
  }, [input])

  const { data, isPending, isError } = useQuery({
    queryKey: ['admin-users', query, page],
    queryFn: () => AdminAPI.searchUsers({ query, page, perPage: PER_PAGE }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ uid, status, reason }: { uid: string; status: UserStatus; reason: string }) =>
      AdminAPI.setUserStatus(uid, status, reason),
    onSuccess: (_d, vars) => {
      toast.success(`User ${vars.status}.`)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || 'Could not update the user.'),
  })

  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(Math.ceil(totalCount / PER_PAGE), 1)
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PER_PAGE + 1
  const rangeEnd = Math.min(page * PER_PAGE, totalCount)

  return (
    <div className='admin-users'>
      <header className='admin-users-head'>
        <h1>Users</h1>
      </header>

      <form className='user-search' onSubmit={e => e.preventDefault()} role='search'>
        <input
          type='text'
          placeholder='Search by username, email, or uid…'
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        {input && (
          <button
            type='button'
            className='clear-btn'
            aria-label='Clear search'
            onClick={() => setInput('')}
          >
            Clear
          </button>
        )}
      </form>

      {isPending ? (
        <p className='users-state'>Loading users…</p>
      ) : isError ? (
        <p className='users-state error'>Failed to load users.</p>
      ) : data.users.length === 0 ? (
        <p className='users-state'>No users found.</p>
      ) : (
        <>
          <p className='users-meta'>
            Showing {rangeStart}–{rangeEnd} of {totalCount}
          </p>
          <ul className='users-list'>
            {data.users.map(user => (
              <UserCard
                key={user.uid}
                user={user}
                busy={statusMutation.isPending}
                onApply={(uid, status, reason) =>
                  statusMutation.mutate({ uid, status, reason })
                }
              />
            ))}
          </ul>
          {totalPages > 1 && (
            <div className='users-pagination'>
              <button
                type='button'
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              >
                Previous
              </button>
              <span className='page-indicator'>
                Page {page} of {totalPages}
              </span>
              <button
                type='button'
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
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

export default Users
