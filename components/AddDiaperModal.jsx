"use client";

import { useActionState, useEffect } from "react";
import { addDiaperEntryAction } from "../app/diaper-actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddDiaperModal({ babyId, onClose, onAdded }) {
  const boundAction = addDiaperEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const defaultDateTime = toLocalDateTimeInput();

  return (
    <Modal title={t("addDiaper.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='diaper_changed_at'>{t("addDiaper.time")}</label>
          <input
            id='diaper_changed_at'
            type='datetime-local'
            name='changed_at'
            required
            defaultValue={defaultDateTime}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='diaper_type'>{t("addDiaper.type")}</label>
          <select id='diaper_type' name='diaper_type' defaultValue='wet' required>
            <option value='wet'>{t("diaper.types.wet")}</option>
            <option value='dirty'>{t("diaper.types.dirty")}</option>
            <option value='both'>{t("diaper.types.both")}</option>
            <option value='dry'>{t("diaper.types.dry")}</option>
          </select>
        </div>
        <div className='form-group'>
          <label htmlFor='diaper_notes'>{t("addDiaper.notes")}</label>
          <input
            id='diaper_notes'
            type='text'
            name='notes'
            placeholder={t("addDiaper.notesPlaceholder")}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addDiaper.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addDiaper.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
