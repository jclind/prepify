import React, { FC } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import './AdminLayout.scss'

// Shell for the admin section. Deliberately separate from the public Layout
// (no marketing navbar/footer) — this is an internal tool. P1 added the queue;
// P2 adds Users; P3 adds the audit trail. Analytics will slot in alongside.
const ADMIN_NAV = [
  { to: '/admin/analytics', label: 'Overview' },
  { to: '/admin/reports', label: 'Reports' },
  { to: '/admin/bug-reports', label: 'Bug reports' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/audit', label: 'Audit log' },
]

const AdminLayout: FC = () => {
  return (
    <div className='admin-layout'>
      <aside className='admin-sidebar'>
        <div className='admin-brand'>
          <NavLink to='/'>Prepify</NavLink>
          <span className='admin-badge'>Admin</span>
        </div>
        <nav className='admin-nav' role='navigation' aria-label='Admin'>
          {ADMIN_NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'admin-nav-link active' : 'admin-nav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className='admin-content'>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
