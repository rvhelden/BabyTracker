'use client';

import { useEffect, useActionState } from 'react';
import { updateBabyAction } from '../app/actions.js';
import Modal from './Modal.jsx';

export default function EditBabyModal({ baby, onClose, onUpdated }) {
  const boundAction = updateBabyAction.bind(null, baby.id);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) onUpdated();
  }, [state?.success]);

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal title="Edit Baby" onClose={onClose}>
      <form action={action}>
        <div className="form-group">
          <label>Name</label>
          <input type="text" name="name" defaultValue={baby.name} required autoFocus />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input type="date" name="birth_date" defaultValue={baby.birth_date} required max={today} />
        </div>
        <div className="form-group">
          <label>Gender</label>
          <select name="gender" defaultValue={baby.gender || ''}>
            <option value="">Prefer not to say</option>
            <option value="female">Girl</option>
            <option value="male">Boy</option>
          </select>
        </div>
        {state?.error && <p className="error-msg">{state.error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
