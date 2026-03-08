"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { addMedicationEntryAction } from "../app/medication-actions.js";
import { nowZoned, parsePlainDateTime, toLocalDateTimeInput } from "../lib/temporal.js";
import { useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function durationLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Check if a medication is "too early" to give again based on the most recent
 * entry with the same name and the template's min interval.
 *
 * Returns null if not too early, or { remainingLabel } if it is.
 */
function checkTooEarly(medicationName, entries, minIntervalMinutes) {
  if (
    !medicationName ||
    !entries?.length ||
    !Number.isFinite(minIntervalMinutes) ||
    minIntervalMinutes <= 0
  ) {
    return null;
  }

  const nameLower = medicationName.trim().toLowerCase();
  const now = nowZoned();
  let lastEntry = null;

  for (const entry of entries) {
    if ((entry.medication_name || "").trim().toLowerCase() === nameLower) {
      if (!lastEntry || entry.given_at > lastEntry.given_at) {
        lastEntry = entry;
      }
    }
  }

  if (!lastEntry) {
    return null;
  }

  const lastWhen = parsePlainDateTime(lastEntry.given_at);
  if (!lastWhen) {
    return null;
  }

  const lastZoned = lastWhen.toZonedDateTime(now.timeZoneId);
  const elapsedMinutes = Math.round(
    now.since(lastZoned, { largestUnit: "minutes" }).total({ unit: "minutes" }),
  );

  if (elapsedMinutes >= minIntervalMinutes) {
    return null;
  }

  const remaining = Math.max(0, minIntervalMinutes - elapsedMinutes);
  return { remainingLabel: durationLabel(remaining) };
}

export default function AddMedicationModal({
  babyId,
  predefinedMedications,
  entries,
  onClose,
  onAdded,
}) {
  const boundAction = addMedicationEntryAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAction, null);
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [tooEarlyConfirmed, setTooEarlyConfirmed] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onAdded();
    }
  }, [state?.success, onAdded]);

  // Reset confirmation checkbox when template changes
  useEffect(() => {
    setTooEarlyConfirmed(false);
  }, [selectedTemplate]);

  const selectedMed =
    selectedTemplate !== "custom"
      ? (predefinedMedications || []).find((m) => String(m.id) === selectedTemplate)
      : null;

  const tooEarlyInfo = useMemo(() => {
    if (!selectedMed) {
      return null;
    }
    return checkTooEarly(selectedMed.medication_name, entries, selectedMed.interval_minutes);
  }, [selectedMed, entries]);

  const saveDisabled = pending || (tooEarlyInfo && !tooEarlyConfirmed);

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

        {tooEarlyInfo && (
          <div className='too-early-warning'>
            <p>
              {t("addMedication.tooEarlyWarning")} (
              {t("medication.waitMore", { time: tooEarlyInfo.remainingLabel })})
            </p>
            <label className='too-early-checkbox'>
              <input
                type='checkbox'
                checked={tooEarlyConfirmed}
                onChange={(e) => setTooEarlyConfirmed(e.target.checked)}
              />
              {t("addMedication.tooEarlyConfirm")}
            </label>
          </div>
        )}

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

            <div className='form-group'>
              <label htmlFor='medication_max_interval'>{t("addMedication.maxInterval")}</label>
              <input
                id='medication_max_interval'
                type='number'
                name='max_interval_hours'
                min='0'
                step='0.25'
                placeholder={t("addMedication.maxIntervalPlaceholder")}
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
          <button type='submit' className='btn btn-primary' disabled={saveDisabled}>
            {pending ? <span className='spinner' /> : t("addMedication.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
