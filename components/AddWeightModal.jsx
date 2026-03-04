"use client";

import { useActionState, useEffect } from "react";
import { addWeightAction } from "../app/actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import Modal from "./Modal.jsx";

export default function AddWeightModal({ babyId, onClose, onAdded }) {
  const boundAction = addWeightAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) onAdded();
  }, [state?.success]);

  const today = toLocalDateInput();

  return (
    <Modal title='Add Weight Entry' onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label>Date</label>
          <input type='date' name='measured_at' required defaultValue={today} max={today} />
        </div>
        <div className='form-group'>
          <label>Weight (grams)</label>
          <input
            type='number'
            name='weight_grams'
            placeholder='e.g. 3500'
            required
            min='100'
            max='50000'
            autoFocus
          />
        </div>
        <div className='form-group'>
          <label>Notes (optional)</label>
          <input type='text' name='notes' placeholder='e.g. After feeding' />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
