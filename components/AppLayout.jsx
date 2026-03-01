'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { logoutAction } from '../app/actions.js';

export default function AppLayout({ user, showBack, children, hideBottomNav }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState('light');
  const isHome = pathname === '/';

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const preferred = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = preferred;
    setTheme(preferred);
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('theme', next);
    setTheme(next);
  }

  function handleLogout() {
    startTransition(() => logoutAction());
  }

  return (
    <div className={`layout${hideBottomNav ? ' no-bottom-nav' : ''}`}>
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
        <div className="navbar-right">
          <Link href="/settings" className="navbar-link" aria-label="Settings">
            ⚙️
          </Link>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <span className="navbar-name">{user?.name}</span>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      {!hideBottomNav && (
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
      )}
    </div>
  );
}
