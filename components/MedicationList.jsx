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

function intervalLabel(intervalMinutes, t) {
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return t("medication.none");
  }

  return durationLabel(intervalMinutes);
}

/**
 * Compute medication status for a given template based on the most recent
 * entry with the same medication name.
 *
 * Returns: { status, className, label }
 *   status: 'too-early' | 'ok' | 'due-soon' | 'overdue' | 'no-interval' | 'no-prior'
 */
function getMedStatus(medicationName, entries, minIntervalMinutes, maxIntervalMinutes, now, t) {
  const hasMin = Number.isFinite(minIntervalMinutes) && minIntervalMinutes > 0;
  const hasMax = Number.isFinite(maxIntervalMinutes) && maxIntervalMinutes > 0;

  if (!hasMin && !hasMax) {
    return {
      status: "no-interval",
      className: "med-status no-interval",
      label: t("medication.noInterval"),
    };
  }

  const nameLower = (medicationName || "").trim().toLowerCase();
  let lastEntry = null;

  for (const entry of entries) {
    if ((entry.medication_name || "").trim().toLowerCase() === nameLower) {
      const when = parsePlainDateTime(entry.given_at);
      if (when) {
        if (!lastEntry || entry.given_at > lastEntry.given_at) {
          lastEntry = entry;
        }
      }
    }
  }

  if (!lastEntry) {
    return {
      status: "no-prior",
      className: "med-status no-prior",
      label: t("medication.noPriorDose"),
    };
  }

  const lastWhen = parsePlainDateTime(lastEntry.given_at);
  const lastZoned = lastWhen.toZonedDateTime(now.timeZoneId);
  const elapsedMinutes = Math.round(
    now.since(lastZoned, { largestUnit: "minutes" }).total({ unit: "minutes" }),
  );

  if (hasMin && elapsedMinutes < minIntervalMinutes) {
    const remaining = Math.max(0, minIntervalMinutes - elapsedMinutes);
    return {
      status: "too-early",
      className: "med-status too-early",
      label: `${t("medication.tooEarly")} (${t("medication.waitMore", { time: durationLabel(remaining) })})`,
    };
  }

  if (hasMax && elapsedMinutes > maxIntervalMinutes) {
    const overdue = elapsedMinutes - maxIntervalMinutes;
    return {
      status: "overdue",
      className: "med-status overdue",
      label: `${t("medication.overdue")} (${t("medication.overdueBy", { time: durationLabel(overdue) })})`,
    };
  }

  if (hasMax && maxIntervalMinutes - elapsedMinutes <= 60) {
    const remaining = Math.max(0, maxIntervalMinutes - elapsedMinutes);
    return {
      status: "due-soon",
      className: "med-status due-soon",
      label: `${t("medication.dueSoon")} (${durationLabel(remaining)})`,
    };
  }

  // In the safe window
  if (hasMax) {
    const remaining = maxIntervalMinutes - elapsedMinutes;
    return {
      status: "ok",
      className: "med-status ok",
      label: `${t("medication.ok")} (${t("medication.nextIn", { time: durationLabel(remaining) })})`,
    };
  }

  // Has min but no max — past the min means OK, no countdown
  return {
    status: "ok",
    className: "med-status ok",
    label: t("medication.ok"),
  };
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

            <div className='form-group'>
              <label htmlFor='medication_edit_max_interval'>
                {t("medicationList.maxInterval")}
              </label>
              <input
                type='number'
                id='medication_edit_max_interval'
                name='max_interval_hours'
                min='0'
                step='0.25'
                defaultValue={
                  Number.isFinite(entry.max_interval_minutes)
                    ? (entry.max_interval_minutes / 60).toFixed(2).replace(/\.00$/, "")
                    : ""
                }
                placeholder={t("medicationList.maxIntervalPlaceholder")}
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

        <div className='form-group' style={{ flex: 1 }}>
          <label htmlFor='template_max_interval'>{t("medicationList.maxInterval")}</label>
          <input
            id='template_max_interval'
            type='number'
            name='max_interval_hours'
            min='0'
            step='0.25'
            placeholder={t("medicationList.maxIntervalPlaceholder")}
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

        <div className='form-group'>
          <label htmlFor='template_edit_max_interval'>{t("medicationList.maxInterval")}</label>
          <input
            id='template_edit_max_interval'
            type='number'
            name='max_interval_hours'
            min='0'
            step='0.25'
            defaultValue={
              Number.isFinite(template.max_interval_minutes)
                ? (template.max_interval_minutes / 60).toFixed(2).replace(/\.00$/, "")
                : ""
            }
            placeholder={t("medicationList.maxIntervalPlaceholder")}
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
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const now = useMemo(() => nowZoned(), []);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.given_at || "").localeCompare(a.given_at || "")),
    [entries],
  );

  const summary = useMemo(() => {
    const currentNow = nowZoned();
    const today = currentNow.toPlainDate().toString();
    const since24h = currentNow.subtract({ hours: 24 });
    let todayCount = 0;
    const activeMeds = new Set();

    for (const entry of sorted) {
      const when = parsePlainDateTime(entry.given_at);
      if (!when) {
        continue;
      }

      const zoned = when.toZonedDateTime(currentNow.timeZoneId);
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
      ? parsePlainDateTime(latest.given_at)?.toZonedDateTime(currentNow.timeZoneId)
      : null;

    return {
      todayCount,
      latest,
      latestElapsed: latestAt ? elapsedLabel(latestAt, currentNow) : "—",
      activeMeds: activeMeds.size,
      latestInterval: latest?.interval_minutes ?? null,
    };
  }, [sorted]);

  const nextDueMed = useMemo(() => {
    const currentNow = nowZoned();
    let closest = null;
    let closestRemaining = Infinity;

    for (const tmpl of predefinedMedications || []) {
      const hasMax = Number.isFinite(tmpl.max_interval_minutes) && tmpl.max_interval_minutes > 0;
      const hasMin = Number.isFinite(tmpl.interval_minutes) && tmpl.interval_minutes > 0;
      if (!hasMax && !hasMin) {
        continue;
      }

      const status = getMedStatus(
        tmpl.medication_name,
        entries,
        tmpl.interval_minutes,
        tmpl.max_interval_minutes,
        currentNow,
        t,
      );

      if (status.status === "no-prior") {
        continue;
      }

      if (status.status === "overdue") {
        return { name: tmpl.medication_name, status };
      }

      if (status.status === "due-soon") {
        return { name: tmpl.medication_name, status };
      }

      if (status.status === "ok" && hasMax) {
        const nameLower = (tmpl.medication_name || "").trim().toLowerCase();
        let lastAt = null;
        for (const entry of entries) {
          if ((entry.medication_name || "").trim().toLowerCase() === nameLower) {
            if (!lastAt || entry.given_at > lastAt) {
              lastAt = entry.given_at;
            }
          }
        }
        if (lastAt) {
          const lastWhen = parsePlainDateTime(lastAt);
          const lastZoned = lastWhen.toZonedDateTime(currentNow.timeZoneId);
          const elapsed = Math.round(
            currentNow.since(lastZoned, { largestUnit: "minutes" }).total({ unit: "minutes" }),
          );
          const remaining = tmpl.max_interval_minutes - elapsed;
          if (remaining < closestRemaining) {
            closestRemaining = remaining;
            closest = { name: tmpl.medication_name, status };
          }
        }
      }
    }

    return closest;
  }, [predefinedMedications, entries, t]);

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

  const currentNow = nowZoned();

  return (
    <div className='medication-list'>
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

        {nextDueMed ? (
          <div className='summary-card card'>
            <div className='summary-label'>
              {nextDueMed.status.status === "overdue"
                ? t("medication.overdue")
                : t("medication.dueSoon")}
            </div>
            <div className='summary-value'>{nextDueMed.name}</div>
            <div className='summary-sub'>
              <span className={nextDueMed.status.className}>{nextDueMed.status.label}</span>
            </div>
          </div>
        ) : (
          <div className='summary-card card'>
            <div className='summary-label'>{t("medication.activeMeds")}</div>
            <div className='summary-value'>{summary.activeMeds}</div>
            <div className='summary-sub'>
              {t("medication.interval")}: {intervalLabel(summary.latestInterval, t)}
            </div>
          </div>
        )}
      </div>

      <div className='card medication-templates-card' style={{ marginBottom: "1rem" }}>
        <div className='section-header'>
          <h3>{t("medicationList.templates")}</h3>
        </div>

        <p className='template-help'>{t("medicationList.templatesHelp")}</p>

        <div className='history-list'>
          {(predefinedMedications || []).map((template) => {
            const status = getMedStatus(
              template.medication_name,
              entries,
              template.interval_minutes,
              template.max_interval_minutes,
              currentNow,
              t,
            );

            return (
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
                    {Number.isFinite(template.max_interval_minutes) &&
                    template.max_interval_minutes > 0
                      ? ` · ${t("medication.maxInterval")}: ${intervalLabel(template.max_interval_minutes, t)}`
                      : ""}
                  </div>
                  <div className='history-row-sub'>
                    <span className={status.className}>{status.label}</span>
                  </div>
                </div>
              </button>
            );
          })}
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
        <div className='history-card card medication-history-card'>
          <p className='history-empty'>{t("medicationList.empty")}</p>
        </div>
      ) : (
        <div className='history-card card medication-history-card'>
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
            {dayEntries.map((entry) => {
              const entryStatus = getMedStatus(
                entry.medication_name,
                entries,
                entry.interval_minutes,
                entry.max_interval_minutes,
                currentNow,
                t,
              );
              const showDot =
                entryStatus.status !== "no-interval" && entryStatus.status !== "no-prior";

              return (
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
                      {entry.interval_minutes
                        ? ` · ${intervalLabel(entry.interval_minutes, t)}`
                        : ""}
                    </div>
                  </div>
                  <div className='history-row-value'>
                    <div className='history-row-secondary'>
                      {formatLocalTime(parsePlainDateTime(entry.given_at), locale)}
                    </div>
                    {showDot && (
                      <span
                        className={`med-status-dot ${entryStatus.status}`}
                        title={entryStatus.label}
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
