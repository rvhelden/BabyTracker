"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslation } from "./LocaleContext.jsx";

export default function AppLayout({ user, showBack, backHref, children }) {
  const pathname = usePathname();
  const router = useRouter();
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

  function handleBack() {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className='layout'>
      <header className='navbar'>
        <div className='navbar-left'>
          {showBack && (
            <button
              type='button'
              className='navbar-back'
              onClick={handleBack}
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
    </div>
  );
}
