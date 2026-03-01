'use client';

import { useEffect, useActionState } from 'react';
import { addMilkAction } from '../app/actions.js';
import Modal from './Modal.jsx';

export default function AddMilkModal({ babyId, onClose, onAdded, defaultVolume }) {
  const boundAction = addMilkAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) onAdded();
  }, [state?.success]);

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const defaultDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <Modal title="Add Milk Feeding" onClose={onClose}>
      <form action={action}>
        <div className="form-group">
          <label>Time</label>
          <input type="datetime-local" name="fed_at" required defaultValue={defaultDateTime} />
        </div>
        <input type="hidden" name="started_at" value="" />
        <input type="hidden" name="ended_at" value="" />
        <input type="hidden" name="duration_minutes" value="" />
        <div className="form-group">
          <label>Amount (ml)</label>
          <input type="number" name="volume_ml" placeholder="e.g. 120" required min="5" max="2000" autoFocus defaultValue={defaultVolume} />
        </div>
        <div className="form-group">
          <label>Notes (optional)</label>
          <input type="text" name="notes" placeholder="e.g. Pumped milk" />
        </div>
        {state?.error && <p className="error-msg">{state.error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
