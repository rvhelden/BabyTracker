"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptInviteAction } from "../app/actions.js";
import { formatLocalDate, parseInstant } from "../lib/temporal.js";

export default function AcceptInviteClient({ token, invite, isLoggedIn }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className='auth-page'>
      <div className='auth-card card invite-accept-card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>Baby Tracker</h1>
        </div>

        <div className='invite-ready'>
          <p className='invite-desc'>
            <strong>{invite.invitedBy}</strong> has invited you to track{" "}
            <strong>{invite.babyName}</strong>'s growth.
          </p>
          <div className='invite-details'>
            <div className='invite-detail-row'>
              <span>Baby</span>
              <strong>{invite.babyName}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>Born</span>
              <strong>{invite.birthDate}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>Invited by</span>
              <strong>{invite.invitedBy}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>Expires</span>
              <strong>
                {formatLocalDate(
                  parseInstant(invite.expiresAt)?.toZonedDateTimeISO().toPlainDate(),
                )}
              </strong>
            </div>
          </div>

          {error && <p className='error-msg'>{error}</p>}

          {isLoggedIn ? (
            <div className='invite-actions'>
              <button
                className='btn btn-primary auth-btn'
                onClick={handleAccept}
                disabled={pending}
              >
                {pending ? <span className='spinner' /> : `Accept Invite`}
              </button>
              <Link href='/' className='btn btn-secondary auth-btn' style={{ textAlign: "center" }}>
                Decline
              </Link>
            </div>
          ) : (
            <>
              <p className='invite-login-hint'>
                Sign in or create an account to accept this invite.
              </p>
              <div className='invite-actions'>
                <Link
                  href={`/login?from=/invite/${token}`}
                  className='btn btn-primary auth-btn'
                  style={{ textAlign: "center" }}
                >
                  Sign In
                </Link>
                <Link
                  href='/signup'
                  className='btn btn-secondary auth-btn'
                  style={{ textAlign: "center" }}
                >
                  Create Account
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
