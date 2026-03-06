"use client";

import { useActionState, useEffect } from "react";
import { createBabyAction } from "../app/actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import Modal from "./Modal.jsx";

export default function AddBabyModal({ onClose, onAdded }) {
  const [state, action, pending] = useActionState(createBabyAction, null);

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const today = toLocalDateInput();

  return (
    <Modal title='Add Baby' onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='baby_name'>Baby's Name</label>
          <input id='baby_name' type='text' name='name' placeholder='e.g. Emma' required />
        </div>
        <div className='form-group'>
          <label htmlFor='baby_birth_date'>Date of Birth</label>
          <input id='baby_birth_date' type='date' name='birth_date' required max={today} />
        </div>
        <div className='form-group'>
          <label htmlFor='baby_gender'>Gender (optional)</label>
          <select id='baby_gender' name='gender'>
            <option value=''>Prefer not to say</option>
            <option value='female'>Girl</option>
            <option value='male'>Boy</option>
          </select>
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            Cancel
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : "Add Baby"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
