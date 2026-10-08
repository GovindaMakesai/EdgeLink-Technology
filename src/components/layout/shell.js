'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  FileText,
  LayoutDashboard,
  Menu,
  Settings,
  Users,
  Waypoints,
  ClipboardList,
  X,
} from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { Badge, Button } from '@/components/ui/primitives';

const ADMIN_LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/audits', label: 'Audits', icon: ClipboardList },
  { href: '/admin/clients', label: 'Clients', icon: Users },
  { href: '/admin/jobs', label: 'Jobs', icon: Waypoints },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

const CLIENT_LINKS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/audits', label: 'Audits', icon: ClipboardList },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
];

function isActive(pathname, link) {
  if (link.exact) return pathname === link.href;
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

export function Shell({ role, userLabel, mockMode, claudeLive, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const links = role === 'admin' ? ADMIN_LINKS : CLIENT_LINKS;

  useEffect(() => {
    document.body.classList.toggle('nav-lock', open);
    return () => document.body.classList.remove('nav-lock');
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="app-shell">
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-violet" />
        <span className="orb orb-cyan" />
        <span className="grid-overlay" />
      </div>
      {open ? <button type="button" className="nav-backdrop" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="sidebar-head">
          <Link href={role === 'admin' ? '/admin' : '/dashboard'} className="brand" onClick={() => setOpen(false)}>
            <LogoMark />
            <div>
              <strong>EdgeLink</strong>
              <span>SEO Intelligence</span>
            </div>
          </Link>
          <Button variant="ghost" className="drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation">
            <X />
          </Button>
        </div>
        <nav className="nav-group" aria-label="Primary">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(pathname, link) ? 'nav-link active' : 'nav-link'}
                onClick={() => setOpen(false)}
              >
                <Icon />
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <p>{role === 'admin' ? 'Internal audit console' : 'Client visibility portal'}</p>
        </div>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="top-meta">
            <Button variant="secondary" className="menu-btn" onClick={() => setOpen((value) => !value)} aria-label="Open navigation">
              <Menu />
            </Button>
            <Activity size={15} className="top-activity" />
            <span className="user-label">{userLabel}</span>
          </div>
          <div className="top-meta top-meta-end">
            <Badge tone={mockMode ? 'violet' : 'good'}>{mockMode ? 'Simulated lab data' : 'Live integrations'}</Badge>
            <Badge tone={claudeLive ? 'good' : 'violet'}>{claudeLive ? 'Claude API' : 'AI mock'}</Badge>
            <Button variant="ghost" onClick={logout}>Sign out</Button>
          </div>
        </header>
        <div className="shell-content">{children}</div>
      </div>
    </div>
  );
}
