import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

export function AppLayout() {
  const { email, logout } = useAuth();
  if (!email) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-main">
          <div className="brand">
            <NavLink to="/">Multi-Rate</NavLink>
          </div>
          <button type="button" className="secondary logout-btn" onClick={logout}>
            Log out
          </button>
        </div>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Documents
          </NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <span className="muted nav-email" title={email ?? undefined}>
            {email}
          </span>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
