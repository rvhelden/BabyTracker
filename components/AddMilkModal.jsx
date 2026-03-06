"use client";

import { useActionState, useEffect } from "react";
import { addMilkAction } from "../app/actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import Modal from "./Modal.jsx";

export default function AddMilkModal({ babyId, onClose, onAdded, defaultVolume }) {
  const boundAction = addMilkAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const defaultDateTime = toLocalDateTimeInput();

  return (
    <Modal title='Add Milk Feeding' onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='fed_at'>Time</label>
          <input
            id='fed_at'
            type='datetime-local'
            name='fed_at'
            required
            defaultValue={defaultDateTime}
          />
        </div>
        <input type='hidden' name='started_at' value='' />
        <input type='hidden' name='ended_at' value='' />
        <input type='hidden' name='duration_minutes' value='' />
        <div className='form-group'>
          <label htmlFor='volume_ml'>Amount (ml)</label>
          <input
            id='volume_ml'
            type='number'
            name='volume_ml'
            placeholder='e.g. 120'
            required
            min='5'
            max='2000'
            defaultValue={defaultVolume}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='milk_notes'>Notes (optional)</label>
          <input id='milk_notes' type='text' name='notes' placeholder='e.g. Pumped milk' />
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
