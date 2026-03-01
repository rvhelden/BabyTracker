'use client';

import { useEffect, useActionState } from 'react';
import { addMilkAction } from '../app/actions.js';
import Modal from './Modal.jsx';

export default function AddMilkModal({ babyId, onClose, onAdded }) {
  const boundAction = addMilkAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) onAdded();
  }, [state?.success]);

  const now = new Date();
  const isoDate = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);
  const defaultDateTime = `${isoDate}T${time}`;

  return (
    <Modal title="Add Milk Feeding" onClose={onClose}>
      <form action={action}>
        <div className="form-group">
          <label>Time</label>
          <input type="datetime-local" name="fed_at" required defaultValue={defaultDateTime} />
        </div>
        <div className="form-group">
          <label>Amount (ml)</label>
          <input type="number" name="volume_ml" placeholder="e.g. 120" required min="5" max="2000" autoFocus />
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
