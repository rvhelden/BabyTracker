"use client";

import { useActionState, useEffect, useState } from "react";
import { addMedicationEntryAction } from "../app/medication-actions.js";
import { toLocalDateTimeInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

export default function AddMedicationModal({ babyId, predefinedMedications, onClose, onAdded }) {
  const boundAction = addMedicationEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  const defaultDateTime = toLocalDateTimeInput();

  return (
    <Modal title={t("addMedication.title")} onClose={onClose}>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='medication_given_at'>{t("addMedication.time")}</label>
          <input
            id='medication_given_at'
            type='datetime-local'
            name='given_at'
            required
            defaultValue={defaultDateTime}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='medication_predefined'>{t("addMedication.predefined")}</label>
          <select
            id='medication_predefined'
            name='predefined_medication_id'
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
          >
            <option value='custom'>{t("addMedication.custom")}</option>
            {(predefinedMedications || []).map((medication) => (
              <option key={medication.id} value={String(medication.id)}>
                {medication.medication_name}
                {medication.dosage ? ` (${medication.dosage})` : ""}
              </option>
            ))}
          </select>
          {selectedTemplate !== "custom" && (
            <p className='template-help'>{t("addMedication.predefinedHelp")}</p>
          )}
        </div>

        {selectedTemplate === "custom" && (
          <>
            <div className='form-group'>
              <label htmlFor='medication_name'>{t("addMedication.name")}</label>
              <input
                id='medication_name'
                type='text'
                name='medication_name'
                placeholder={t("addMedication.namePlaceholder")}
                required
              />
            </div>

            <div className='form-group'>
              <label htmlFor='medication_dosage'>{t("addMedication.dosage")}</label>
              <input
                id='medication_dosage'
                type='text'
                name='dosage'
                placeholder={t("addMedication.dosagePlaceholder")}
              />
            </div>

            <div className='form-group'>
              <label htmlFor='medication_interval'>{t("addMedication.interval")}</label>
              <input
                id='medication_interval'
                type='number'
                name='interval_hours'
                min='0'
                step='0.25'
                placeholder={t("addMedication.intervalPlaceholder")}
              />
            </div>
          </>
        )}

        <div className='form-group'>
          <label htmlFor='medication_notes'>{t("addMedication.notes")}</label>
          <input
            id='medication_notes'
            type='text'
            name='notes'
            placeholder={t("addMedication.notesPlaceholder")}
          />
        </div>

        {state?.error && <p className='error-msg'>{state.error}</p>}

        <div className='modal-actions'>
          <button type='button' className='btn btn-secondary' onClick={onClose}>
            {t("addMedication.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("addMedication.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
