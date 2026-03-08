"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { logoutAction } from "../app/actions.js";
import { useTranslation } from "./LocaleContext.jsx";

export default function AppLayout({ user, showBack, children, hideBottomNav }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [theme, setTheme] = useState("light");
  const isHome = pathname === "/";
  const t = useTranslation();

  useEffect(() => {
    const saved = window.localStorage.getItem("theme");
    const preferred =
      saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = preferred;
    setTheme(preferred);
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("theme", next);
    setTheme(next);
  }

  function handleLogout() {
    startTransition(() => logoutAction());
  }

  return (
    <div className={`layout${hideBottomNav ? " no-bottom-nav" : ""}`}>
      <header className='navbar'>
        <div className='navbar-left'>
          {showBack && (
            <button
              type='button'
              className='navbar-back'
              onClick={() => router.back()}
              aria-label={t("nav.goBack")}
            >
              ←
            </button>
          )}
          <Link href='/?dashboard=1' className='navbar-brand'>
            <span className='navbar-icon'>🍼</span>
            <span className='navbar-title'>Baby Tracker</span>
          </Link>
        </div>
        <div className='navbar-right'>
          <Link href='/settings' className='navbar-link' aria-label={t("nav.settings")}>
            ⚙️
          </Link>
          <button
            type='button'
            className='theme-toggle'
            onClick={toggleTheme}
            aria-label={t("nav.toggleDarkMode")}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <span className='navbar-name'>{user?.name}</span>
        </div>
      </header>

      <main className='main-content'>{children}</main>

      {!hideBottomNav && (
        <nav className='bottom-nav' aria-label='Main navigation'>
          <Link href='/?dashboard=1' className={`bnav-item${isHome ? " active" : ""}`}>
            <span className='bnav-icon'>🏠</span>
            <span className='bnav-label'>{t("nav.home")}</span>
          </Link>
          <button type='button' className='bnav-item' onClick={handleLogout} disabled={pending}>
            <span className='bnav-icon'>👤</span>
            <span className='bnav-label'>{pending ? t("nav.loggingOut") : t("nav.logout")}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
