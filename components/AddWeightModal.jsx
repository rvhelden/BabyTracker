"use client";

import { useActionState, useEffect } from "react";
import { addWeightAction } from "../app/actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddWeightModal({ babyId, onClose, onAdded }) {
  const boundAction = addWeightAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const today = toLocalDateInput();

  return (
    <Modal title={t("addWeight.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='weight_measured_at'>{t("addWeight.date")}</label>
          <input
            id='weight_measured_at'
            type='date'
            name='measured_at'
            required
            defaultValue={today}
            max={today}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='weight_grams'>{t("addWeight.weight")}</label>
          <input
            id='weight_grams'
            type='number'
            name='weight_grams'
            placeholder={t("addWeight.weightPlaceholder")}
            required
            min='100'
            max='50000'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='weight_notes'>{t("addWeight.notes")}</label>
          <input
            id='weight_notes'
            type='text'
            name='notes'
            placeholder={t("addWeight.notesPlaceholder")}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addWeight.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addWeight.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
