"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { acceptInviteAction } from "../app/actions.js";
import { formatLocalDate, parseInstant, timeZone } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";

export default function AcceptInviteClient({ token, invite, isLoggedIn }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(null);
  const inviteExpiresInstant = parseInstant(invite?.expiresAt);

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className='auth-page'>
      <div className='auth-card card invite-accept-card'>
        <div className='auth-header'>
          <div className='auth-logo'>🍼</div>
          <h1>{t("auth.appName")}</h1>
        </div>

        <div className='invite-ready'>
          <p className='invite-desc'>
            {t("acceptInvite.invitedTo", {
              invitedBy: invite.invitedBy,
              babyName: invite.babyName,
            })}
          </p>
          <div className='invite-details'>
            <div className='invite-detail-row'>
              <span>{t("acceptInvite.baby")}</span>
              <strong>{invite.babyName}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>{t("acceptInvite.born")}</span>
              <strong>{invite.birthDate}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>{t("acceptInvite.invitedBy")}</span>
              <strong>{invite.invitedBy}</strong>
            </div>
            <div className='invite-detail-row'>
              <span>{t("acceptInvite.expires")}</span>
              <strong>
                {inviteExpiresInstant
                  ? formatLocalDate(
                      inviteExpiresInstant.toZonedDateTimeISO(timeZone).toPlainDate(),
                      locale,
                    )
                  : ""}
              </strong>
            </div>
          </div>

          {error && <p className='error-msg'>{error}</p>}

          {isLoggedIn ? (
            <div className='invite-actions'>
              <button
                type='button'
                className='btn btn-primary auth-btn'
                onClick={handleAccept}
                disabled={pending}
              >
                {pending ? <span className='spinner' /> : t("acceptInvite.accept")}
              </button>
              <Link href='/' className='btn btn-secondary auth-btn' style={{ textAlign: "center" }}>
                {t("acceptInvite.decline")}
              </Link>
            </div>
          ) : (
            <>
              <p className='invite-login-hint'>{t("acceptInvite.loginHint")}</p>
              <div className='invite-actions'>
                <Link
                  href={`/login?from=/invite/${token}`}
                  className='btn btn-primary auth-btn'
                  style={{ textAlign: "center" }}
                >
                  {t("acceptInvite.signIn")}
                </Link>
                <Link
                  href='/signup'
                  className='btn btn-secondary auth-btn'
                  style={{ textAlign: "center" }}
                >
                  {t("acceptInvite.createAccount")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
