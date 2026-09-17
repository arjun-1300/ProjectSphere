import type React from 'react';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, Plus, Search, Shield, LayoutDashboard, User as UserIcon, LogOut, Sparkles } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { notificationsApi } from '@/lib/api/notifications';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

export function Navbar() {
  const { user, status, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.list({ limit: 1 }),
    enabled: status === 'authenticated',
    refetchInterval: 60_000,
  });
  const unread = (notif?.meta.unreadCount as number | undefined) ?? 0;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand"><span className="brand-mark" />ProjectSphere</Link>

        <nav className="row gap-6 nav-desktop" style={{ marginLeft: 12 }}>
          <NavLink to="/" end className={({ isActive }) => cn('nav-link', isActive && 'active')}>Discover</NavLink>
          <NavLink to="/search" className={({ isActive }) => cn('nav-link', isActive && 'active')}>Search</NavLink>
          {status === 'authenticated' && (
            <NavLink to="/ai" className={({ isActive }) => cn('nav-link', isActive && 'active')}>AI Studio</NavLink>
          )}
        </nav>

        <div className="grow" />

        {status === 'authenticated' && user ? (
          <div className="row gap-3">
            <Link to="/projects/new" className="btn btn-primary btn-sm"><Plus size={15} /> New project</Link>
            <Link to="/notifications" className="btn btn-ghost btn-icon" style={{ position: 'relative' }} aria-label="Notifications">
              <Bell size={18} />
              {unread > 0 && <span className="pill-count" style={{ position: 'absolute', top: 2, right: 2 }}>{unread > 9 ? '9+' : unread}</span>}
            </Link>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu">
                <Avatar name={user.username} size={30} />
              </button>
              {menuOpen && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
                  <div className="card" style={{ position: 'absolute', right: 0, top: 42, width: 210, padding: 6, zIndex: 41 }}>
                    <div className="mono" style={{ padding: '8px 10px', borderBottom: '1px dashed var(--line)' }}>@{user.username}</div>
                    <MenuLink to={`/u/${user.username}`} icon={<UserIcon size={15} />} label="Profile" onClick={() => setMenuOpen(false)} />
                    <MenuLink to="/dashboard" icon={<LayoutDashboard size={15} />} label="Dashboard" onClick={() => setMenuOpen(false)} />
                    <MenuLink to="/ai" icon={<Sparkles size={15} />} label="AI Studio" onClick={() => setMenuOpen(false)} />
                    {user.role === 'ADMIN' && <MenuLink to="/admin" icon={<Shield size={15} />} label="Admin" onClick={() => setMenuOpen(false)} />}
                    <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }} onClick={async () => { setMenuOpen(false); await logout(); navigate('/'); }}>
                      <LogOut size={15} /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : status === 'anonymous' ? (
          <div className="row gap-2">
            <Link to="/search" className="btn btn-ghost btn-icon nav-desktop" aria-label="Search"><Search size={18} /></Link>
            <Link to="/login" className="btn btn-secondary btn-sm">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Join</Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function MenuLink({ to, icon, label, onClick }: { to: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link to={to} onClick={onClick} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', gap: 8 }}>
      {icon} {label}
    </Link>
  );
}
