"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteMilkAction, updateMilkAction } from "../app/actions.js";
import { formatLocalTime, parsePlainDate, parsePlainDateTime } from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";
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
          <label htmlFor='fed_at'>Time</label>
          <input type='datetime-local' id='fed_at' name='fed_at' defaultValue={defaultDateTime} />
        </div>
        <div className='form-group'>
          <label htmlFor='volume_ml'>Amount (ml)</label>
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
            <label htmlFor='started_at'>Started</label>
            <input
              type='datetime-local'
              id='started_at'
              name='started_at'
              defaultValue={defaultStartedAt}
            />
          </div>
          <div className='form-group' style={{ flex: 1 }}>
            <label htmlFor='ended_at'>Ended</label>
            <input
              type='datetime-local'
              id='ended_at'
              name='ended_at'
              defaultValue={defaultEndedAt}
            />
          </div>
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='notes'>Notes</label>
          <input
            type='text'
            id='notes'
            name='notes'
            placeholder='Optional note…'
            defaultValue={entry.notes || ""}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='milk-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            Cancel
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : "Save"}
          </button>
        </div>
      </form>
      <div className='edit-dialog-delete'>
        {confirmingDelete ? (
          <div className='delete-confirm-row'>
            <span>Delete this entry?</span>
            <button
              type='button'
              className='btn btn-secondary btn-sm'
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </button>
            <button
              type='button'
              className='btn btn-danger btn-sm'
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? <span className='spinner' /> : "Delete"}
            </button>
          </div>
        ) : (
          <button
            type='button'
            className='btn btn-danger btn-sm'
            onClick={() => setConfirmingDelete(true)}
          >
            Delete entry
          </button>
        )}
      </div>
    </div>
  );
}

export default function MilkList({ entries, babyId, onMutated }) {
  const locale = useLocale()?.locale;
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
    return <p className='milk-empty'>No feedings yet. Tap + to start one.</p>;
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
    <div className='milk-list'>
      {openDialogEntry && (
        <Modal title='Edit feeding' onClose={() => setDialogEntry(null)}>
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
          aria-label='Previous day'
        >
          ‹
        </button>
        <button
          type='button'
          className='day-title'
          onClick={openDatePicker}
          aria-label='Pick a date'
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
          aria-label='Next day'
        >
          ›
        </button>
      </div>
      <div className='milk-day-entries single'>
        {dayEntries.map((entry) => (
          <button
            key={entry.id}
            type='button'
            className='milk-row card milk-row-btn'
            onClick={() => setDialogEntry(entry.id)}
          >
            <div className='milk-row-main'>
              <span className='milk-row-icon'>🍼</span>
              <span className='milk-row-time'>
                {formatLocalTime(parsePlainDateTime(entry.fed_at), locale)}
              </span>
              <span className='milk-row-amount'>{entry.volume_ml} ml</span>
              {entry.duration_minutes != null && (
                <span className='milk-row-meta'>⏱️ {entry.duration_minutes}m</span>
              )}
              {entry.notes && <span className='milk-row-notes'>💬 {entry.notes}</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
