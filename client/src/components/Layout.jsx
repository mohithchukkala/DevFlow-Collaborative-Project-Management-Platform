import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Avatar from './Avatar.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar__brand">
          <span className="logo">▦</span> DevFlow
        </div>

        <div className="sidebar__section">Workspace</div>
        <NavLink to="/" end className="nav-link" onClick={close}>
          <span className="ico">🏠</span> Dashboard
        </NavLink>
        <NavLink to="/projects" className="nav-link" onClick={close}>
          <span className="ico">📁</span> Projects
        </NavLink>

        {user?.role === 'Admin' && (
          <>
            <div className="sidebar__section">Admin</div>
            <NavLink to="/admin/users" className="nav-link" onClick={close}>
              <span className="ico">👥</span> Users
            </NavLink>
          </>
        )}

        <div className="sidebar__spacer" />
        <NavLink to="/profile" className="nav-link" onClick={close}>
          <span className="ico">⚙️</span> Profile
        </NavLink>
        <div className="sidebar__user">
          <Avatar user={user} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11 }}>{user?.role}</div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ color: '#c7cbe0' }} onClick={handleLogout} title="Log out">
            ⎋
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="btn btn--ghost menu-toggle" onClick={() => setMenuOpen((o) => !o)}>
            ☰
          </button>
          <div className="topbar__spacer" />
          <NotificationBell />
          <Avatar user={user} />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
