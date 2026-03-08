"use client";

import { useActionState, useEffect } from "react";
import { addGrowthEntryAction } from "../app/growth-actions.js";
import { toLocalDateInput } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function lengthUnitForLocale(locale) {
  if ((locale || "").toLowerCase().startsWith("en")) {
    return "in";
  }

  return "cm";
}

export default function AddGrowthEntryModal({ babyId, onClose, onAdded }) {
  const boundAction = addGrowthEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const locale = useLocale()?.locale;
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const today = toLocalDateInput();
  const lengthUnit = lengthUnitForLocale(locale);

  return (
    <Modal title={t("addGrowthEntry.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='growth_measured_at'>{t("addGrowthEntry.date")}</label>
          <input
            id='growth_measured_at'
            type='date'
            name='measured_at'
            required
            defaultValue={today}
            max={today}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='weight_grams'>{t("addGrowthEntry.weight")}</label>
          <input
            id='weight_grams'
            type='number'
            name='weight_grams'
            placeholder={t("addGrowthEntry.weightPlaceholder")}
            min='100'
            max='50000'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='growth_length_value'>
            {t("addGrowthEntry.length", { unit: lengthUnit })}
          </label>
          <input
            id='growth_length_value'
            type='number'
            name='length_value'
            placeholder={t("addGrowthEntry.lengthPlaceholder")}
            min='1'
            step='0.1'
          />
        </div>
        <div className='form-group'>
          <label htmlFor='growth_notes'>{t("addGrowthEntry.notes")}</label>
          <input
            id='growth_notes'
            type='text'
            name='notes'
            placeholder={t("addGrowthEntry.notesPlaceholder")}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addGrowthEntry.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addGrowthEntry.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
