'use client';

import { useState, useTransition } from 'react';
import { createInviteAction } from '../app/actions.js';
import Modal from './Modal.jsx';

export default function InviteModal({ babyId, babyName, onClose }) {
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function generate() {
    setError('');
    startTransition(async () => {
      const result = await createInviteAction(babyId);
      if (result?.error) { setError(result.error); return; }
      setInvite(result);
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const expiresLabel = invite ? new Date(invite.expiresAt).toLocaleDateString() : '';

  return (
    <Modal title={`Share ${babyName}'s Profile`} onClose={onClose}>
      <div className="invite-modal">
        {!invite ? (
          <>
            <p className="invite-info">
              Generate a QR code that another parent can scan to link their account to <strong>{babyName}</strong>'s profile.
              The link expires in 7 days.
            </p>
            {error && <p className="error-msg">{error}</p>}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={generate} disabled={pending}>
                {pending ? <span className="spinner" /> : 'Generate QR Code'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="invite-info">Scan this QR code or share the link. Expires on <strong>{expiresLabel}</strong>.</p>
            <div className="qr-container">
              <img src={invite.qrDataUrl} alt="QR Code invite" className="qr-image" />
            </div>
            <div className="invite-link-row">
              <input readOnly value={invite.inviteUrl} className="invite-link-input" />
              <button className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`} onClick={copyLink}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="invite-note">
              The invited person must create an account (or log in) before accepting the invite.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => { setInvite(null); generate(); }} disabled={pending}>
                New Code
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
