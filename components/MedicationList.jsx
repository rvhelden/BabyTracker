"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  addPredefinedMedicationAction,
  deleteMedicationEntryAction,
  deletePredefinedMedicationAction,
  updateMedicationEntryAction,
  updatePredefinedMedicationAction,
} from "../app/medication-actions.js";
import { formatLocalTime, nowZoned, parsePlainDate, parsePlainDateTime } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function elapsedLabel(entryDateTime, nowDateTime) {
  if (!entryDateTime || !nowDateTime) {
    return "—";
  }

  const totalMinutes = Math.max(
    0,
    Math.round(
      nowDateTime.since(entryDateTime, { largestUnit: "minutes" }).total({ unit: "minutes" }),
    ),
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function intervalLabel(intervalMinutes, t) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return t("medication.none");
  }

  const hours = Math.floor(intervalMinutes / 60);
  const mins = intervalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

function dayKeyFromDateTime(value) {
  const dateTime = parsePlainDateTime(value);
  if (!dateTime) {
    return "";
  }

  return dateTime.toPlainDate().toString();
}

function EditEntryForm({ entry, babyId, predefinedMedications, onDone, onDelete, deleting }) {
  const boundUpdate = updateMedicationEntryAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  const defaultDateTime =
    parsePlainDateTime(entry.given_at)?.toString({ smallestUnit: "minute" }) || "";

  return (
    <div className='growth-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='medication_edit_time'>{t("medicationList.time")}</label>
          <input
            type='datetime-local'
            id='medication_edit_time'
            name='given_at'
            defaultValue={defaultDateTime}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='medication_edit_template'>{t("medicationList.template")}</label>
          <select
            id='medication_edit_template'
            name='predefined_medication_id'
            value={selectedTemplate}
            onChange={(event) => setSelectedTemplate(event.target.value)}
          >
            <option value='custom'>{t("medicationList.custom")}</option>
            {(predefinedMedications || []).map((medication) => (
              <option key={medication.id} value={String(medication.id)}>
                {medication.medication_name}
                {medication.dosage ? ` (${medication.dosage})` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedTemplate === "custom" && (
          <>
            <div className='form-group'>
              <label htmlFor='medication_edit_name'>{t("medicationList.name")}</label>
              <input
                type='text'
                id='medication_edit_name'
                name='medication_name'
                defaultValue={entry.medication_name || ""}
              />
            </div>

            <div className='form-group'>
              <label htmlFor='medication_edit_dosage'>{t("medicationList.dosage")}</label>
              <input
                type='text'
                id='medication_edit_dosage'
                name='dosage'
                defaultValue={entry.dosage || ""}
                placeholder={t("medicationList.dosagePlaceholder")}
              />
            </div>

            <div className='form-group'>
              <label htmlFor='medication_edit_interval'>{t("medicationList.interval")}</label>
              <input
                type='number'
                id='medication_edit_interval'
                name='interval_hours'
                min='0'
                step='0.25'
                defaultValue={
                  Number.isFinite(entry.interval_minutes)
                    ? (entry.interval_minutes / 60).toFixed(2).replace(/\.00$/, "")
                    : ""
                }
                placeholder={t("medicationList.intervalPlaceholder")}
              />
            </div>
          </>
        )}

        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='medication_edit_notes'>{t("medicationList.notes")}</label>
          <input
            type='text'
            id='medication_edit_notes'
            name='notes'
            placeholder={t("medicationList.noteOptional")}
            defaultValue={entry.notes || ""}
          />
        </div>

        {state?.error && <p className='error-msg'>{state.error}</p>}

        <div className='growth-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("medicationList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("medicationList.save")}
          </button>
        </div>
      </form>

      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("medicationList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("medicationList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("medicationList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("medicationList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

function AddTemplateForm({ babyId, onAdded }) {
  const boundAdd = addPredefinedMedicationAction.bind(null, babyId);
  const [state, action, pending] = useActionState(boundAdd, null);
  const handledSuccessRef = useRef(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success && !handledSuccessRef.current) {
      handledSuccessRef.current = true;
      onAdded();
      return;
    }

    if (!state?.success) {
      handledSuccessRef.current = false;
    }
  }, [state?.success, onAdded]);

  return (
    <form action={action} className='predefined-med-form'>
      <p className='template-help'>{t("medicationList.templatesHelp")}</p>

      <div className='form-row'>
        <div className='form-group' style={{ flex: 2 }}>
          <label htmlFor='template_name'>{t("medicationList.name")}</label>
          <input id='template_name' type='text' name='medication_name' required />
        </div>

        <div className='form-group' style={{ flex: 2 }}>
          <label htmlFor='template_dosage'>{t("medicationList.dosage")}</label>
          <input
            id='template_dosage'
            type='text'
            name='dosage'
            placeholder={t("medicationList.dosagePlaceholder")}
          />
        </div>

        <div className='form-group' style={{ flex: 1 }}>
          <label htmlFor='template_interval'>{t("medicationList.interval")}</label>
          <input
            id='template_interval'
            type='number'
            name='interval_hours'
            min='0'
            step='0.25'
            placeholder={t("medicationList.intervalPlaceholder")}
          />
        </div>
      </div>

      {state?.error && <p className='error-msg'>{state.error}</p>}

      <div className='modal-actions'>
        <button type='submit' className='btn btn-primary' disabled={pending}>
          {pending ? <span className='spinner' /> : t("medicationList.addTemplate")}
        </button>
      </div>
    </form>
  );
}

function EditTemplateForm({ template, babyId, onDone, onDelete, deleting }) {
  const boundUpdate = updatePredefinedMedicationAction.bind(null, babyId, template.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  return (
    <div className='growth-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='template_edit_name'>{t("medicationList.name")}</label>
          <input
            id='template_edit_name'
            type='text'
            name='medication_name'
            defaultValue={template.medication_name || ""}
            required
          />
        </div>

        <div className='form-group'>
          <label htmlFor='template_edit_dosage'>{t("medicationList.dosage")}</label>
          <input
            id='template_edit_dosage'
            type='text'
            name='dosage'
            defaultValue={template.dosage || ""}
            placeholder={t("medicationList.dosagePlaceholder")}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='template_edit_interval'>{t("medicationList.interval")}</label>
          <input
            id='template_edit_interval'
            type='number'
            name='interval_hours'
            min='0'
            step='0.25'
            defaultValue={
              Number.isFinite(template.interval_minutes)
                ? (template.interval_minutes / 60).toFixed(2).replace(/\.00$/, "")
                : ""
            }
            placeholder={t("medicationList.intervalPlaceholder")}
          />
        </div>

        {state?.error && <p className='error-msg'>{state.error}</p>}

        <div className='growth-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("medicationList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("medicationList.save")}
          </button>
        </div>
      </form>

      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("medicationList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("medicationList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("medicationList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("medicationList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MedicationList({ entries, predefinedMedications, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [templateDialog, setTemplateDialog] = useState(null);
  const [templateDeleting, setTemplateDeleting] = useState(null);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const dateInputRef = useRef(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.given_at || "").localeCompare(a.given_at || "")),
    [entries],
  );

  const summary = useMemo(() => {
    const now = nowZoned();
    const today = now.toPlainDate().toString();
    const since24h = now.subtract({ hours: 24 });
    let todayCount = 0;
    const activeMeds = new Set();

    for (const entry of sorted) {
      const when = parsePlainDateTime(entry.given_at);
      if (!when) {
        continue;
      }

      const zoned = when.toZonedDateTime(now.timeZoneId);
      if (zoned.toPlainDate().toString() === today) {
        todayCount += 1;
      }
      if (zoned.epochMilliseconds >= since24h.epochMilliseconds) {
        if (entry.medication_name) {
          activeMeds.add(entry.medication_name.trim().toLowerCase());
        }
      }
    }

    const latest = sorted[0] || null;
    const latestAt = latest
      ? parsePlainDateTime(latest.given_at)?.toZonedDateTime(now.timeZoneId)
      : null;

    return {
      todayCount,
      latest,
      latestElapsed: latestAt ? elapsedLabel(latestAt, now) : "—",
      activeMeds: activeMeds.size,
      latestInterval: latest?.interval_minutes ?? null,
    };
  }, [sorted]);

  const days = useMemo(
    () => Array.from(new Set(sorted.map((entry) => dayKeyFromDateTime(entry.given_at)))),
    [sorted],
  );
  const safeIndex = Math.min(selectedIndex, Math.max(days.length - 1, 0));
  const activeDay = days[safeIndex];
  const dayEntries = activeDay
    ? sorted.filter((entry) => dayKeyFromDateTime(entry.given_at) === activeDay)
    : [];

  useEffect(() => {
    if (!days.length) {
      return;
    }

    setSelectedIndex(0);
  }, [days.length]);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteMedicationEntryAction(babyId, id);
      if (result?.error) {
        alert(result.error);
      } else {
        setDialogEntry(null);
        onMutated();
      }
    } finally {
      setDeleting(null);
    }
  }

  async function handleTemplateDelete(id) {
    setTemplateDeleting(id);
    try {
      const result = await deletePredefinedMedicationAction(babyId, id);
      if (result?.error) {
        alert(result.error);
      } else {
        setTemplateDialog(null);
        onMutated();
      }
    } finally {
      setTemplateDeleting(null);
    }
  }

  function handlePrevDay() {
    setSelectedIndex((idx) => Math.min(days.length - 1, idx + 1));
  }

  function handleNextDay() {
    setSelectedIndex((idx) => Math.max(0, idx - 1));
  }

  function handlePickDate(e) {
    const value = e.target.value;
    if (!value) {
      return;
    }

    const exactIndex = days.indexOf(value);
    if (exactIndex >= 0) {
      setSelectedIndex(exactIndex);
      return;
    }

    const target = parsePlainDate(value)?.toPlainDateTime({ hour: 0, minute: 0 }).toZonedDateTime();
    let closestIndex = 0;
    let closestDiff = Infinity;

    days.forEach((day, idx) => {
      const ts = parsePlainDate(day)?.toPlainDateTime({ hour: 0, minute: 0 }).toZonedDateTime();
      if (!ts || !target || ts.epochMilliseconds > target.epochMilliseconds) {
        return;
      }

      const diff = target.epochMilliseconds - ts.epochMilliseconds;
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = idx;
      }
    });

    setSelectedIndex(closestIndex);
  }

  function openDatePicker() {
    if (!dateInputRef.current) {
      return;
    }

    dateInputRef.current.showPicker?.();
    dateInputRef.current.focus();
  }

  const openDialogEntry = dialogEntry ? entries.find((entry) => entry.id === dialogEntry) : null;
  const openTemplate = templateDialog
    ? (predefinedMedications || []).find((entry) => entry.id === templateDialog)
    : null;

  return (
    <div>
      <div className='growth-summary'>
        <div className='summary-card card'>
          <div className='summary-label'>{t("medication.today")}</div>
          <div className='summary-value'>{summary.todayCount}</div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("medication.lastGiven")}</div>
          <div className='summary-value'>{summary.latest?.medication_name || "—"}</div>
          <div className='summary-sub'>{summary.latestElapsed}</div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("medication.activeMeds")}</div>
          <div className='summary-value'>{summary.activeMeds}</div>
          <div className='summary-sub'>
            {t("medication.interval")}: {intervalLabel(summary.latestInterval, t)}
          </div>
        </div>
      </div>

      <div className='card' style={{ marginBottom: "1rem" }}>
        <div className='section-header'>
          <h3>{t("medicationList.templates")}</h3>
        </div>

        <p className='template-help'>{t("medicationList.templatesHelp")}</p>

        <div className='history-list'>
          {(predefinedMedications || []).map((template) => (
            <button
              key={template.id}
              type='button'
              className='history-row'
              onClick={() => setTemplateDialog(template.id)}
            >
              <span className='history-row-icon'>📌</span>
              <div className='history-row-body'>
                <div className='history-row-title'>
                  {template.medication_name}
                  {template.dosage ? ` (${template.dosage})` : ""}
                </div>
                <div className='history-row-sub'>
                  {t("medication.interval")}: {intervalLabel(template.interval_minutes, t)}
                </div>
              </div>
            </button>
          ))}
          <button
            type='button'
            className='history-row template-add-row'
            onClick={() => setShowAddTemplate(true)}
          >
            <span className='history-row-icon'>➕</span>
            <div className='history-row-body'>
              <div className='history-row-title'>{t("medicationList.addTemplate")}</div>
            </div>
          </button>
        </div>
      </div>

      {showAddTemplate && (
        <Modal title={t("medicationList.addTemplate")} onClose={() => setShowAddTemplate(false)}>
          <AddTemplateForm
            babyId={babyId}
            onAdded={() => {
              setShowAddTemplate(false);
              onMutated();
            }}
          />
        </Modal>
      )}

      {openTemplate && (
        <Modal
          title={t("medicationList.editTemplateTitle")}
          onClose={() => setTemplateDialog(null)}
        >
          <EditTemplateForm
            template={openTemplate}
            babyId={babyId}
            onDone={() => {
              setTemplateDialog(null);
              onMutated();
            }}
            onDelete={() => handleTemplateDelete(openTemplate.id)}
            deleting={templateDeleting === openTemplate.id}
          />
        </Modal>
      )}

      {openDialogEntry && (
        <Modal title={t("medicationList.editTitle")} onClose={() => setDialogEntry(null)}>
          <EditEntryForm
            entry={openDialogEntry}
            babyId={babyId}
            predefinedMedications={predefinedMedications || []}
            onDone={() => {
              setDialogEntry(null);
              onMutated();
            }}
            onDelete={() => handleDelete(openDialogEntry.id)}
            deleting={deleting === openDialogEntry.id}
          />
        </Modal>
      )}

      {sorted.length === 0 ? (
        <div className='history-card card'>
          <p className='history-empty'>{t("medicationList.empty")}</p>
        </div>
      ) : (
        <div className='history-card card'>
          <div className='milk-day-header single'>
            <button
              type='button'
              className='day-nav'
              onClick={handlePrevDay}
              disabled={safeIndex >= days.length - 1}
              aria-label={t("milkList.prevDay")}
            >
              ‹
            </button>

            <button
              type='button'
              className='day-title'
              onClick={openDatePicker}
              aria-label={t("milkList.pickDate")}
            >
              <div>{activeDay}</div>
              <div className='day-total'>{dayEntries.length}</div>
              <input
                ref={dateInputRef}
                type='date'
                className='day-picker'
                value={activeDay || ""}
                onChange={handlePickDate}
              />
            </button>

            <button
              type='button'
              className='day-nav'
              onClick={handleNextDay}
              disabled={safeIndex === 0}
              aria-label={t("milkList.nextDay")}
            >
              ›
            </button>
          </div>

          <div className='history-list'>
            {dayEntries.map((entry) => (
              <button
                key={entry.id}
                type='button'
                className='history-row'
                onClick={() => setDialogEntry(entry.id)}
              >
                <span className='history-row-icon'>💊</span>
                <div className='history-row-body'>
                  <div className='history-row-title'>
                    {entry.medication_name}
                    {entry.dosage ? ` (${entry.dosage})` : ""}
                  </div>
                  <div className='history-row-sub'>
                    {entry.notes || ""}
                    {entry.interval_minutes ? ` · ${intervalLabel(entry.interval_minutes, t)}` : ""}
                  </div>
                </div>
                <div className='history-row-value'>
                  <div className='history-row-secondary'>
                    {formatLocalTime(parsePlainDateTime(entry.given_at), locale)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
