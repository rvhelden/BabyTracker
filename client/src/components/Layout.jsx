import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const isHome = location.pathname === '/';

  return (
    <div className="layout">
      <header className="navbar">
        <div className="navbar-left">
          {!isHome && (
            <button className="navbar-back" onClick={() => navigate(-1)} aria-label="Go back">
              ←
            </button>
          )}
          <Link to="/" className="navbar-brand">
            <span className="navbar-icon">🍼</span>
            <span className="navbar-title">Baby Tracker</span>
          </Link>
        </div>
        <span className="navbar-name">{user?.name}</span>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        <Link to="/" className={`bnav-item ${isHome ? 'active' : ''}`}>
          <span className="bnav-icon">🏠</span>
          <span className="bnav-label">Home</span>
        </Link>
        <button className="bnav-item" onClick={handleLogout}>
          <span className="bnav-icon">👤</span>
          <span className="bnav-label">Log out</span>
        </button>
      </nav>
    </div>
  );
}
