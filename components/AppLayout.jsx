'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { logoutAction } from '../app/actions.js';

export default function AppLayout({ user, showBack, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isHome = pathname === '/';

  function handleLogout() {
    startTransition(() => logoutAction());
  }

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-left">
          {showBack && (
            <button className="navbar-back" onClick={() => router.back()} aria-label="Go back">
              ←
            </button>
          )}
          <Link href="/" className="navbar-brand">
            <span className="navbar-icon">🍼</span>
            <span className="navbar-title">Baby Tracker</span>
          </Link>
        </div>
        <span className="navbar-name">{user?.name}</span>
      </header>

      <main className="main-content">
        {children}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <Link href="/" className={`bnav-item${isHome ? ' active' : ''}`}>
          <span className="bnav-icon">🏠</span>
          <span className="bnav-label">Home</span>
        </Link>
        <button className="bnav-item" onClick={handleLogout} disabled={pending}>
          <span className="bnav-icon">👤</span>
          <span className="bnav-label">{pending ? '…' : 'Log out'}</span>
        </button>
      </nav>
    </div>
  );
}
