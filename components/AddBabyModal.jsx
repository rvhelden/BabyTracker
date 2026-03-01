'use client';

import { useEffect, useActionState } from 'react';
import { createBabyAction } from '../app/actions.js';
import Modal from './Modal.jsx';

export default function AddBabyModal({ onClose, onAdded }) {
  const [state, action, pending] = useActionState(createBabyAction, null);

  useEffect(() => {
    if (state?.success) onAdded();
  }, [state?.success]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal title="Add Baby" onClose={onClose}>
      <form action={action}>
        <div className="form-group">
          <label>Baby's Name</label>
          <input type="text" name="name" placeholder="e.g. Emma" required autoFocus />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input type="date" name="birth_date" required max={today} />
        </div>
        <div className="form-group">
          <label>Gender (optional)</label>
          <select name="gender">
            <option value="">Prefer not to say</option>
            <option value="female">Girl</option>
            <option value="male">Boy</option>
          </select>
        </div>
        {state?.error && <p className="error-msg">{state.error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <span className="spinner" /> : 'Add Baby'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
