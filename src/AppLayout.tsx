import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './auth';

export function AppLayout() {
  const { email, logout } = useAuth();
  if (!email) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">Multi-Rate</div>
        <nav className="nav">
          <NavLink to="/" end>
            Documents
          </NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <span className="muted">{email}</span>
          <button type="button" className="secondary" onClick={logout}>
            Log out
          </button>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
