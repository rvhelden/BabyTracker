"use client";

import { useActionState, useEffect } from "react";
import { addTemperatureEntryAction } from "../app/temperature-actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function isEnglishLocale(locale) {
  return (locale || "").toLowerCase().startsWith("en");
}

export default function AddTemperatureModal({ babyId, onClose, onAdded }) {
  const boundAction = addTemperatureEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const locale = useLocale()?.locale;
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const defaultDateTime = toLocalDateTimeInput();
  const unit = isEnglishLocale(locale) ? "°F" : "°C";

  return (
    <Modal title={t("addTemperature.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='temperature_measured_at'>{t("addTemperature.time")}</label>
          <input
            id='temperature_measured_at'
            type='datetime-local'
            name='measured_at'
            required
            defaultValue={defaultDateTime}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='temperature_value'>{t("addTemperature.temperature", { unit })}</label>
          <input
            id='temperature_value'
            type='number'
            name='temperature_value'
            placeholder={t("addTemperature.temperaturePlaceholder")}
            step='0.1'
            required
          />
        </div>
        <div className='form-group'>
          <label htmlFor='temperature_notes'>{t("addTemperature.notes")}</label>
          <input
            id='temperature_notes'
            type='text'
            name='notes'
            placeholder={t("addTemperature.notesPlaceholder")}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addTemperature.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addTemperature.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
