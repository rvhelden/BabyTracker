"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteMilkAction, updateMilkAction } from "../app/milk-actions.js";
import { formatLocalTime, parsePlainDate, parsePlainDateTime } from "../lib/temporal.js";
import { useLocale, useTranslation } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function formatDayKey(value) {
  const date = parsePlainDate(value) || parsePlainDateTime(value)?.toPlainDate();
  if (!date) {
    return value;
  }
  return date.toString();
}

function EditForm({ entry, babyId, onDone, onDelete, deleting }) {
  const boundUpdate = updateMilkAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const t = useTranslation();

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  const defaultDateTime =
    parsePlainDateTime(entry.fed_at)?.toString({ smallestUnit: "minute" }) || "";

  const defaultStartedAt = entry.started_at
    ? parsePlainDateTime(entry.started_at)?.toString({ smallestUnit: "minute" }) || ""
    : "";

  const defaultEndedAt = entry.ended_at
    ? parsePlainDateTime(entry.ended_at)?.toString({ smallestUnit: "minute" }) || ""
    : "";

  return (
    <div className='milk-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='fed_at'>{t("milkList.time")}</label>
          <input type='datetime-local' id='fed_at' name='fed_at' defaultValue={defaultDateTime} />
        </div>
        <div className='form-group'>
          <label htmlFor='volume_ml'>{t("milkList.amount")}</label>
          <input
            type='number'
            id='volume_ml'
            name='volume_ml'
            defaultValue={entry.volume_ml}
            min='5'
            max='2000'
          />
        </div>
        <div className='form-row'>
          <div className='form-group' style={{ flex: 1 }}>
            <label htmlFor='started_at'>{t("milkList.started")}</label>
            <input
              type='datetime-local'
              id='started_at'
              name='started_at'
              defaultValue={defaultStartedAt}
            />
          </div>
          <div className='form-group' style={{ flex: 1 }}>
            <label htmlFor='ended_at'>{t("milkList.ended")}</label>
            <input
              type='datetime-local'
              id='ended_at'
              name='ended_at'
              defaultValue={defaultEndedAt}
            />
          </div>
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='notes'>{t("milkList.notes")}</label>
          <input
            type='text'
            id='notes'
            name='notes'
            placeholder={t("milkList.noteOptional")}
            defaultValue={entry.notes || ""}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='milk-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            {t("milkList.cancel")}
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : t("milkList.save")}
          </button>
        </div>
      </form>
      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>{t("milkList.deleteConfirm")}</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              {t("milkList.cancel")}
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : t("milkList.deleteEntry")}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            {t("milkList.deleteEntry")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function MilkList({ entries, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const t = useTranslation();
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const dateInputRef = useRef(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteMilkAction(babyId, id);
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

  const sorted = [...entries].sort((a, b) => b.fed_at.localeCompare(a.fed_at));
  const days = Array.from(new Set(sorted.map((entry) => formatDayKey(entry.fed_at))));
  const safeIndex = Math.min(selectedIndex, Math.max(days.length - 1, 0));
  const activeDay = days[safeIndex];
  const dayEntries = activeDay
    ? sorted.filter((entry) => formatDayKey(entry.fed_at) === activeDay)
    : [];
  const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.volume_ml, 0);

  useEffect(() => {
    if (!days.length) {
      return;
    }
    setSelectedIndex(0);
  }, [days.length]);

  if (entries.length === 0) {
    return <p className='history-empty'>{t("feeding.noFeedingsYet")}</p>;
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
    // If exact date isn't present, pick the closest earlier day
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

  const openDialogEntry = dialogEntry ? entries.find((e) => e.id === dialogEntry) : null;

  return (
    <div>
      {openDialogEntry && (
        <Modal title={t("milkList.editTitle")} onClose={() => setDialogEntry(null)}>
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
          <div className='day-total'>{dayTotal} ml</div>
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
            <span className='history-row-icon'>🍼</span>
            <div className='history-row-body'>
              <div className='history-row-title'>
                {formatLocalTime(parsePlainDateTime(entry.fed_at), locale)}
              </div>
              {(entry.duration_minutes != null || entry.notes) && (
                <div className='history-row-sub'>
                  {entry.duration_minutes != null && `${entry.duration_minutes}m`}
                  {entry.duration_minutes != null && entry.notes && " · "}
                  {entry.notes}
                </div>
              )}
            </div>
            <div className='history-row-value'>
              <div className='history-row-primary'>{entry.volume_ml} ml</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
