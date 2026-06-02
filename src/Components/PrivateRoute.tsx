import React, { FC } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from 'src/context/AuthContext'
const PrivateRoute: FC = () => {
  const authRes = useAuth()

  return authRes?.user ? <Outlet /> : <Navigate to='/login' />
}

export default PrivateRoute
