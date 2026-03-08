"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { deleteDiaperEntryAction, updateDiaperEntryAction } from "../app/diaper-actions.js";
import { formatLocalTime, nowZoned, parsePlainDate, parsePlainDateTime } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function typeEmoji(type) {
  if (type === "dirty") {
    return "💩";
  }

  if (type === "both") {
    return "💧💩";
  }

  if (type === "dry") {
    return "⬜";
  }

  return "💧";
}

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

  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return `${days}d ${hours}h ago`;
  }

  if (totalHours > 0) {
    return `${totalHours}h ago`;
  }

  return `${totalMinutes}m ago`;
}

function dayKeyFromDateTime(value) {
  const dateTime = parsePlainDateTime(value);
  if (!dateTime) {
    return "";
  }

  return dateTime.toPlainDate().toString();
}

function EditForm({ entry, babyId, onDone, onDelete, deleting }) {
  const boundUpdate = updateDiaperEntryAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  const defaultDateTime =
    parsePlainDateTime(entry.changed_at)?.toString({ smallestUnit: "minute" }) || "";

  return (
    <div className='growth-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='diaper_edit_time'>{t("diaperList.time")}</label>
          <input
            type='datetime-local'
            id='diaper_edit_time'
            name='changed_at'
            defaultValue={defaultDateTime}
          />
        </div>

        <div className='form-group'>
          <label htmlFor='diaper_edit_type'>{t("diaperList.type")}</label>
          <select
            id='diaper_edit_type'
            name='diaper_type'
            defaultValue={entry.diaper_type || "wet"}
          >
            <option value='wet'>{t("diaper.types.wet")}</option>
            <option value='dirty'>{t("diaper.types.dirty")}</option>
            <option value='both'>{t("diaper.types.both")}</option>
            <option value='dry'>{t("diaper.types.dry")}</option>
          </select>
        </div>

        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='diaper_edit_notes'>{t("diaperList.notes")}</label>
          <input
            type='text'
            id='diaper_edit_notes'
            name='notes'
            placeholder={t("diaperList.noteOptional")}
            defaultValue={entry.notes || ""}
          />
        </div>

        {state?.error && <p className='error-msg'>{state.error}</p>}

        <div className='growth-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("diaperList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("diaperList.save")}
          </button>
        </div>
      </form>

      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("diaperList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("diaperList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("diaperList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("diaperList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function DiaperList({ entries, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dateInputRef = useRef(null);

  const sorted = useMemo(
    () => [...entries].sort((a, b) => (b.changed_at || "").localeCompare(a.changed_at || "")),
    [entries],
  );

  const summary = useMemo(() => {
    const now = nowZoned();
    const todayKey = now.toPlainDate().toString();
    const since24h = now.subtract({ hours: 24 });
    let todayTotal = 0;
    let todayWet = 0;
    let todayDirty = 0;
    let todayBoth = 0;
    let last24h = 0;

    for (const entry of entries) {
      const when = parsePlainDateTime(entry.changed_at);
      if (!when) {
        continue;
      }

      const zoned = when.toZonedDateTime(now.timeZoneId);
      const isToday = zoned.toPlainDate().toString() === todayKey;
      if (isToday) {
        todayTotal += 1;
        if (entry.diaper_type === "wet") {
          todayWet += 1;
        }
        if (entry.diaper_type === "dirty") {
          todayDirty += 1;
        }
        if (entry.diaper_type === "both") {
          todayBoth += 1;
        }
      }

      if (zoned.epochMilliseconds >= since24h.epochMilliseconds) {
        last24h += 1;
      }
    }

    const latestWet = sorted.find(
      (entry) => entry.diaper_type === "wet" || entry.diaper_type === "both",
    );
    const latestDirty = sorted.find(
      (entry) => entry.diaper_type === "dirty" || entry.diaper_type === "both",
    );

    const latestWetAt = latestWet
      ? parsePlainDateTime(latestWet.changed_at)?.toZonedDateTime(now.timeZoneId)
      : null;
    const latestDirtyAt = latestDirty
      ? parsePlainDateTime(latestDirty.changed_at)?.toZonedDateTime(now.timeZoneId)
      : null;

    return {
      todayTotal,
      todayWet,
      todayDirty,
      todayBoth,
      last24h,
      lastWetAgo: latestWetAt ? elapsedLabel(latestWetAt, now) : t("diaper.never"),
      lastDirtyAgo: latestDirtyAt ? elapsedLabel(latestDirtyAt, now) : t("diaper.never"),
    };
  }, [entries, sorted, t]);

  const days = useMemo(
    () => Array.from(new Set(sorted.map((entry) => dayKeyFromDateTime(entry.changed_at)))),
    [sorted],
  );
  const safeIndex = Math.min(selectedIndex, Math.max(days.length - 1, 0));
  const activeDay = days[safeIndex];
  const dayEntries = activeDay
    ? sorted.filter((entry) => dayKeyFromDateTime(entry.changed_at) === activeDay)
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
      const result = await deleteDiaperEntryAction(babyId, id);
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
          <div className='summary-label'>{t("diaper.today")}</div>
          <div className='summary-value'>{summary.todayTotal}</div>
          <div className='summary-sub'>
            {t("diaper.todayBreakdown", {
              wet: summary.todayWet,
              dirty: summary.todayDirty,
              both: summary.todayBoth,
            })}
          </div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("diaper.last24h")}</div>
          <div className='summary-value'>{summary.last24h}</div>
        </div>

        <div className='summary-card card'>
          <div className='summary-label'>{t("diaper.lastWet")}</div>
          <div className='summary-value'>{summary.lastWetAgo}</div>
          <div className='summary-sub'>
            {t("diaper.lastDirty")}: {summary.lastDirtyAgo}
          </div>
        </div>
      </div>

      {openDialogEntry && (
        <Modal title={t("diaperList.editTitle")} onClose={() => setDialogEntry(null)}>
          <EditForm
            entry={openDialogEntry}
            babyId={babyId}
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
        <p className='history-empty'>{t("diaperList.empty")}</p>
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
                <span className='history-row-icon'>{typeEmoji(entry.diaper_type)}</span>
                <div className='history-row-body'>
                  <div className='history-row-title'>
                    {t(`diaper.types.${entry.diaper_type || "wet"}`)}
                  </div>
                  <div className='history-row-sub'>{entry.notes || ""}</div>
                </div>
                <div className='history-row-value'>
                  <div className='history-row-secondary'>
                    {formatLocalTime(parsePlainDateTime(entry.changed_at), locale)}
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
