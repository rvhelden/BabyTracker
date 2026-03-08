"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteTemperatureEntryAction,
  updateTemperatureEntryAction,
} from "../app/temperature-actions.js";
import {
  formatLocalTime,
  nowZoned,
  parsePlainDate,
  parsePlainDateTime,
  toLocalDateTimeInput,
} from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function isEnglishLocale(locale) {
  return (locale || "").toLowerCase().startsWith("en");
}

function toDisplayTemp(celsius, locale) {
  if (!Number.isFinite(celsius)) {
    return "—";
  }

  if (isEnglishLocale(locale)) {
    return `${((celsius * 9) / 5 + 32).toFixed(1)} °F`;
  }

  return `${celsius.toFixed(1)} °C`;
}

function statusKey(celsius, locale) {
  if (!Number.isFinite(celsius)) {
    return "normal";
  }

  const display = isEnglishLocale(locale) ? (celsius * 9) / 5 + 32 : celsius;

  if (display >= (isEnglishLocale(locale) ? 100.4 : 38.0)) {
    return "fever";
  }

  if (display >= (isEnglishLocale(locale) ? 99.5 : 37.5)) {
    return "elevated";
  }

  return "normal";
}

function dayKeyFromDateTime(value) {
  const dateTime = parsePlainDateTime(value);
  if (!dateTime) {
    return "";
  }

  return dateTime.toPlainDate().toString();
}

function EditForm({ entry, babyId, onDone, onDelete, deleting, locale }) {
  const boundUpdate = updateTemperatureEntryAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  const defaultDateTime = toLocalDateTimeInput(parsePlainDateTime(entry.measured_at));
  const defaultValue =
    isEnglishLocale(locale) && Number.isFinite(entry.temperature_c)
      ? ((entry.temperature_c * 9) / 5 + 32).toFixed(1)
      : Number.isFinite(entry.temperature_c)
        ? entry.temperature_c.toFixed(1)
        : "";

  return (
    <div className='growth-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='temperature_edit_time'>{t("temperatureList.time")}</label>
          <input
            type='datetime-local'
            id='temperature_edit_time'
            name='measured_at'
            defaultValue={defaultDateTime}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='temperature_edit_value'>
            {t("temperatureList.temperature", {
              unit: isEnglishLocale(locale) ? "°F" : "°C",
            })}
          </label>
          <input
            type='number'
            id='temperature_edit_value'
            name='temperature_value'
            defaultValue={defaultValue}
            step='0.1'
          />
        </div>

        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='temperature_edit_notes'>{t("temperatureList.notes")}</label>
          <input
            type='text'
            id='temperature_edit_notes'
            name='notes'
            placeholder={t("temperatureList.noteOptional")}
            defaultValue={entry.notes || ""}
          />
        </div>

        {state?.error && <p className='error-msg'>{state.error}</p>}

        <div className='growth-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("temperatureList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("temperatureList.save")}
          </button>
        </div>
      </form>

      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("temperatureList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("temperatureList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("temperatureList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("temperatureList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TemperatureList({ entries, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dateInputRef = useRef(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.measured_at || "").localeCompare(a.measured_at || "")),
    [entries],
  );

  const summary = useMemo(() => {
    const now = nowZoned();
    const today = now.toPlainDate().toString();
    const todayEntries = sorted.filter((entry) => {
      const when = parsePlainDateTime(entry.measured_at);
      if (!when) {
        return false;
      }

      return when.toPlainDate().toString() === today;
    });

    const todayValues = todayEntries
      .map((entry) => entry.temperature_c)
      .filter((value) => Number.isFinite(value));
    const latest = sorted[0] || null;
    const latestTemp = Number.isFinite(latest?.temperature_c) ? latest.temperature_c : null;

    return {
      latest,
      latestTemp,
      low: todayValues.length ? Math.min(...todayValues) : null,
      high: todayValues.length ? Math.max(...todayValues) : null,
      status: statusKey(latestTemp, locale),
    };
  }, [sorted, locale]);

  const days = useMemo(
    () => Array.from(new Set(sorted.map((entry) => dayKeyFromDateTime(entry.measured_at)))),
    [sorted],
  );
  const safeIndex = Math.min(selectedIndex, Math.max(days.length - 1, 0));
  const activeDay = days[safeIndex];
  const dayEntries = activeDay
    ? sorted.filter((entry) => dayKeyFromDateTime(entry.measured_at) === activeDay)
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
      const result = await deleteTemperatureEntryAction(babyId, id);
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

  return (
    <div>
      <div className='growth-summary'>
        <div className='summary-card card'>
          <div className='summary-label'>{t("temperature.latest")}</div>
          <div className='summary-value'>{toDisplayTemp(summary.latestTemp, locale)}</div>
          <div className='summary-sub'>
            {summary.latest
              ? formatLocalTime(parsePlainDateTime(summary.latest.measured_at), locale)
              : "—"}
          </div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("temperature.todayRange")}</div>
          <div className='summary-value'>
            {summary.low == null || summary.high == null
              ? "—"
              : `${toDisplayTemp(summary.low, locale)} - ${toDisplayTemp(summary.high, locale)}`}
          </div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("temperature.status")}</div>
          <div className={`summary-value temp-status ${summary.status}`}>
            {t(`temperature.statusValues.${summary.status}`)}
          </div>
        </div>
      </div>

      {openDialogEntry && (
        <Modal title={t("temperatureList.editTitle")} onClose={() => setDialogEntry(null)}>
          <EditForm
            entry={openDialogEntry}
            babyId={babyId}
            locale={locale}
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
        <p className='history-empty'>{t("temperatureList.empty")}</p>
      ) : (
        <>
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
                <span className='history-row-icon'>🌡️</span>
                <div className='history-row-body'>
                  <div className='history-row-title'>
                    {toDisplayTemp(entry.temperature_c, locale)}
                  </div>
                  <div className='history-row-sub'>{entry.notes || ""}</div>
                </div>
                <div className='history-row-value'>
                  <div className='history-row-secondary'>
                    {formatLocalTime(parsePlainDateTime(entry.measured_at), locale)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
