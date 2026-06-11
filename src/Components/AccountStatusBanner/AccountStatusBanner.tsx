import React, { FC } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from 'src/context/AuthContext'
import AuthAPI from 'src/api/auth'
import './AccountStatusBanner.scss'

// Persistent, site-wide notice shown to a suspended/banned user so they know
// up front — rather than only discovering it when a write fails (the toast in
// http-common stays as the at-the-moment confirmation). Self-gating like
// ReportControl: renders nothing for logged-out or active accounts. Fetches the
// user's own status (GET /getMyStatus) once they're signed in.
const AccountStatusBanner: FC = () => {
  const authRes = useAuth()
  const user = authRes?.user

  const { data } = useQuery({
    queryKey: ['my-status', user?.uid],
    queryFn: () => AuthAPI.getAccountStatus(),
    enabled: !!user,
    staleTime: 60_000,
  })

  if (!data || data.status === 'active') return null

  const banned = data.status === 'banned'
  return (
    <div className={`account-status-banner ${data.status}`} role='alert'>
      <span className='asb-text'>
        <strong>
          {banned ? 'Your account has been banned.' : 'Your account is suspended.'}
        </strong>{' '}
        You can still browse, but posting recipes, reviewing, saving, and
        reporting are disabled.
        {data.statusReason && <span className='asb-reason'> Reason: {data.statusReason}</span>}
      </span>
    </div>
  )
}

export default AccountStatusBanner
