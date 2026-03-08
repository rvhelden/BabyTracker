"use client";

import { useActionState, useEffect } from "react";
import { addMilkAction } from "../app/actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddMilkModal({ babyId, onClose, onAdded, defaultVolume }) {
  const boundAction = addMilkAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const defaultDateTime = toLocalDateTimeInput();

  return (
    <Modal title={t("addMilk.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='fed_at'>{t("addMilk.time")}</label>
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
          <label htmlFor='volume_ml'>{t("addMilk.amount")}</label>
          <input
            id='volume_ml'
            type='number'
            name='volume_ml'
            placeholder={t("addMilk.amountPlaceholder")}
            required
            min='5'
            max='2000'
            defaultValue={defaultVolume}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='milk_notes'>{t("addMilk.notes")}</label>
          <input
            id='milk_notes'
            type='text'
            name='notes'
            placeholder={t("addMilk.notesPlaceholder")}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addMilk.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addMilk.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
