import React, { FC } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from 'src/context/AuthContext'

// Like PrivateRoute, but also requires the admin custom claim. Non-admins
// (logged in or not) are sent home rather than to /login so we don't leak the
// existence of the admin section. authLoading guards the window before the
// claim has resolved, otherwise a real admin would be bounced on refresh.
const AdminRoute: FC = () => {
  const authRes = useAuth()

  if (authRes?.authLoading) return null

  return authRes?.user && authRes.isAdmin ? <Outlet /> : <Navigate to='/' />
}

export default AdminRoute
