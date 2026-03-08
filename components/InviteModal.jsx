"use client";

import { useState, useTransition } from "react";
import { createInviteAction } from "../app/actions.js";
import { formatLocalDate, parseInstant, timeZone } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function InviteModal({ babyId, babyName, onClose }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError("");
    startTransition(async () => {
      const result = await createInviteAction(babyId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setInvite(result);
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inviteExpiresInstant = parseInstant(invite?.expiresAt);
  const expiresLabel = inviteExpiresInstant
    ? formatLocalDate(inviteExpiresInstant.toZonedDateTimeISO(timeZone).toPlainDate(), locale)
    : "";

  return (
    <Modal title={t("invite.shareTitle", { name: babyName })} onClose={onClose}>
      <div className='invite-modal'>
        {!invite ? (
          <>
            <p className='invite-info'>{t("invite.generateInfo", { name: babyName })}</p>
            {error && <p className='error-msg'>{error}</p>}
            <div className='modal-actions'>
              <button type='button' className='btn btn-secondary' onClick={onClose}>
                {t("invite.cancel")}
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={generate}
                disabled={pending}
              >
                {pending ? <span className='spinner' /> : t("invite.generate")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className='invite-info'>{t("invite.scanInfo", { date: expiresLabel })}</p>
            <div className='qr-container'>
              <img src={invite.qrDataUrl} alt='QR Code invite' className='qr-image' />
            </div>
            <div className='invite-link-row'>
              <input readOnly value={invite.inviteUrl} className='invite-link-input' />
              <button
                type='button'
                className={`btn ${copied ? "btn-secondary" : "btn-primary"}`}
                onClick={copyLink}
              >
                {copied ? t("invite.copied") : t("invite.copy")}
              </button>
            </div>
            <p className='invite-note'>{t("invite.note")}</p>
            <div className='modal-actions'>
              <button type='button' className='btn btn-secondary' onClick={onClose}>
                {t("invite.close")}
              </button>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => {
                  setInvite(null);
                  generate();
                }}
                disabled={pending}
              >
                {t("invite.newCode")}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
