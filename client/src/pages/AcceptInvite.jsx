import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';
import './AuthPage.css';
import './AcceptInvite.css';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error | done
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    api.invites.info(token)
      .then(data => { setInvite(data); setStatus('ready'); })
      .catch(err => { setError(err.message); setStatus('error'); });
  }, [token]);

  async function handleAccept() {
    if (!user) {
      // save token and redirect to login
      sessionStorage.setItem('pending_invite', token);
      navigate('/login');
      return;
    }
    setAccepting(true);
    try {
      const result = await api.invites.accept(token);
      navigate(`/baby/${result.babyId}`);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    } finally {
      setAccepting(false);
    }
  }

  // If user just logged in and there's a pending invite, auto-accept
  useEffect(() => {
    const pending = sessionStorage.getItem('pending_invite');
    if (pending && user && status === 'ready') {
      sessionStorage.removeItem('pending_invite');
      handleAccept();
    }
  }, [user, status]);

  return (
    <div className="auth-page">
      <div className="auth-card card invite-accept-card">
        <div className="auth-header">
          <div className="auth-logo">🍼</div>
          <h1>Baby Tracker</h1>
        </div>

        {status === 'loading' && <p className="invite-status">Loading invite...</p>}

        {status === 'error' && (
          <div className="invite-error">
            <p className="error-msg">{error}</p>
            <Link to="/" className="btn btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>
              Go to Dashboard
            </Link>
          </div>
        )}

        {status === 'ready' && invite && (
          <div className="invite-ready">
            <p className="invite-desc">
              <strong>{invite.invitedBy}</strong> has invited you to track <strong>{invite.babyName}</strong>'s growth.
            </p>
            <div className="invite-details">
              <div className="invite-detail-row">
                <span>Baby</span>
                <strong>{invite.babyName}</strong>
              </div>
              <div className="invite-detail-row">
                <span>Born</span>
                <strong>{invite.birthDate}</strong>
              </div>
              <div className="invite-detail-row">
                <span>Invited by</span>
                <strong>{invite.invitedBy}</strong>
              </div>
            </div>

            {!user && (
              <p className="invite-login-hint">
                You need to <Link to={`/login`}>sign in</Link> or <Link to="/signup">create an account</Link> to accept this invite.
              </p>
            )}

            {error && <p className="error-msg">{error}</p>}

            <div className="invite-actions">
              {user ? (
                <button className="btn btn-primary auth-btn" onClick={handleAccept} disabled={accepting}>
                  {accepting ? <span className="spinner" /> : `Accept & Link to ${invite.babyName}`}
                </button>
              ) : (
                <>
                  <Link to={`/login`} className="btn btn-primary auth-btn" style={{ textAlign: 'center' }}
                    onClick={() => sessionStorage.setItem('pending_invite', token)}>
                    Sign in to Accept
                  </Link>
                  <Link to="/signup" className="btn btn-secondary auth-btn" style={{ textAlign: 'center', marginTop: '0.5rem' }}
                    onClick={() => sessionStorage.setItem('pending_invite', token)}>
                    Create Account
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
