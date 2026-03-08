"use client";

import { useActionState, useEffect, useState } from "react";
import { addDiaperEntryAction } from "../app/diaper-actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddDiaperModal({ babyId, onClose, onAdded }) {
  const boundAction = addDiaperEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const [diaperType, setDiaperType] = useState("wet");
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
          <label>{t("addDiaper.type")}</label>
          <input type='hidden' name='diaper_type' value={diaperType} />
          <div className='diaper-type-grid' role='radiogroup' aria-label={t("addDiaper.type")}>
            {[
              { value: "wet", icon: "💧", label: t("diaper.types.wet") },
              { value: "dirty", icon: "💩", label: t("diaper.types.dirty") },
              { value: "both", icon: "💧💩", label: t("diaper.types.both") },
              { value: "dry", icon: "⬜", label: t("diaper.types.dry") },
            ].map((option) => (
              <button
                key={option.value}
                type='button'
                className={`diaper-type-btn${diaperType === option.value ? " active" : ""}`}
                onClick={() => setDiaperType(option.value)}
                role='radio'
                aria-checked={diaperType === option.value}
              >
                <span className='diaper-type-icon'>{option.icon}</span>
                <span className='diaper-type-label'>{option.label}</span>
              </button>
            ))}
          </div>
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
