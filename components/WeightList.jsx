"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteWeightAction, updateWeightAction } from "../app/actions.js";
import { formatLocalDate, parsePlainDate } from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";

function formatDateLabel(value, locale) {
  const date = parsePlainDate(value);
  if (!date) {
    return value;
  }
  return formatLocalDate(date, locale);
}

function EditForm({ entry, babyId, onDone }) {
  const boundUpdate = updateWeightAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);

  useEffect(() => {
    if (state?.success) {
      onDone();
    }
  }, [state?.success, onDone]);

  return (
    <div className='weight-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label htmlFor='weight_edit_date'>Date</label>
          <input
            id='weight_edit_date'
            type='date'
            name='measured_at'
            defaultValue={entry.measured_at}
          />
        </div>
        <div className='form-group'>
          <label htmlFor='weight_edit_grams'>Weight (grams)</label>
          <input
            id='weight_edit_grams'
            type='number'
            name='weight_grams'
            defaultValue={entry.weight_grams}
            min='100'
            max='50000'
          />
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label htmlFor='weight_edit_notes'>Notes</label>
          <input
            id='weight_edit_notes'
            type='text'
            name='notes'
            placeholder='Optional note…'
            defaultValue={entry.notes || ""}
          />
        </div>
        {state?.error && <p className='error-msg'>{state.error}</p>}
        <div className='weight-edit-actions'>
          <button type='button' className='btn btn-secondary' onClick={onDone}>
            Cancel
          </button>
          <button type='submit' className='btn btn-primary' disabled={pending}>
            {pending ? <span className='spinner' /> : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDeleteBar({ onConfirm, onCancel, deleting }) {
  return (
    <div className='swipe-confirm-bar'>
      <span className='swipe-confirm-msg'>Delete this entry?</span>
      <div className='swipe-confirm-actions'>
        <button type='button' className='btn btn-secondary btn-sm' onClick={onCancel}>
          Cancel
        </button>
        <button
          type='button'
          className='btn btn-danger btn-sm'
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? <span className='spinner' /> : "Delete"}
        </button>
      </div>
    </div>
  );
}

export default function WeightList({ weights, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [swipeState, setSwipeState] = useState({ id: null, offset: 0, isDragging: false });
  const touchStartXRef = useRef(null);
  const touchRowIdRef = useRef(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteWeightAction(babyId, id);
      if (result?.error) {
        alert(result.error);
        setConfirmDelete(null);
      } else {
        setConfirmDelete(null);
        onMutated();
      }
    } finally {
      setDeleting(null);
    }
  }

  function handleRowTouchStart(id, e) {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    touchRowIdRef.current = id;
    setSwipeState({ id, offset: 0, isDragging: true });
  }

  function handleRowTouchMove(id, e) {
    if (touchRowIdRef.current !== id || touchStartXRef.current == null) {
      return;
    }
    const currentX = e.touches[0]?.clientX;
    if (typeof currentX !== "number") {
      return;
    }
    const dx = currentX - touchStartXRef.current;
    const clamped = Math.max(-84, Math.min(84, dx));
    setSwipeState({ id, offset: clamped, isDragging: true });
  }

  function handleRowTouchEnd(id, e) {
    if (touchRowIdRef.current !== id || touchStartXRef.current == null) {
      return;
    }
    const endX = e.changedTouches[0]?.clientX;
    if (typeof endX !== "number") {
      touchStartXRef.current = null;
      touchRowIdRef.current = null;
      return;
    }
    const dx = endX - touchStartXRef.current;
    setSwipeState({ id, offset: 0, isDragging: false });
    // Swipe left → edit
    if (dx <= -45) {
      setTimeout(() => {
        setConfirmDelete(null);
        setEditing(id);
      }, 120);
    }
    // Swipe right → delete with confirmation
    if (dx >= 45) {
      setTimeout(() => {
        setEditing(null);
        setConfirmDelete(id);
      }, 120);
    }
    touchStartXRef.current = null;
    touchRowIdRef.current = null;
  }

  function handleRowTouchCancel() {
    setSwipeState({ id: null, offset: 0, isDragging: false });
    touchStartXRef.current = null;
    touchRowIdRef.current = null;
  }

  if (weights.length === 0) {
    return <p className='weight-empty'>No measurements yet. Tap + to add one.</p>;
  }

  const sorted = [...weights].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  return (
    <div className='weight-list'>
      {sorted.map((w, idx) => {
        const prev = sorted[idx + 1];
        const diff = prev ? w.weight_grams - prev.weight_grams : null;

        if (editing === w.id) {
          return (
            <div key={w.id} className='weight-card editing'>
              <EditForm
                entry={w}
                babyId={babyId}
                onDone={() => {
                  setEditing(null);
                  onMutated();
                }}
              />
            </div>
          );
        }

        if (confirmDelete === w.id) {
          return (
            <div key={w.id} className='weight-card'>
              <ConfirmDeleteBar
                deleting={deleting === w.id}
                onConfirm={() => handleDelete(w.id)}
                onCancel={() => setConfirmDelete(null)}
              />
            </div>
          );
        }

        return (
          <div
            key={w.id}
            className={`swipe-row${swipeState.id === w.id && swipeState.offset !== 0 ? " active" : ""}`}
          >
            <div className='swipe-underlay'>
              <div className='swipe-underlay-left'>Delete</div>
              <div className='swipe-underlay-right'>Edit</div>
            </div>
            <div
              className='weight-card swipe-gesture-card'
              style={{
                transform: `translateX(${swipeState.id === w.id ? swipeState.offset : 0}px)`,
                transition:
                  swipeState.id === w.id && swipeState.isDragging ? "none" : "transform 160ms ease",
              }}
              onTouchStart={(e) => handleRowTouchStart(w.id, e)}
              onTouchMove={(e) => handleRowTouchMove(w.id, e)}
              onTouchEnd={(e) => handleRowTouchEnd(w.id, e)}
              onTouchCancel={handleRowTouchCancel}
            >
              <div className='weight-card-body'>
                <div className='weight-row-main'>
                  <div className='weight-card-left'>
                    <div className='weight-date'>{formatDateLabel(w.measured_at, locale)}</div>
                    {w.notes && <div className='weight-notes'>{w.notes}</div>}
                  </div>
                  <div className='weight-card-mid'>
                    <div className='weight-grams'>{w.weight_grams} g</div>
                    <div className='weight-kg'>{(w.weight_grams / 1000).toFixed(3)} kg</div>
                  </div>
                  <div className='weight-card-right'>
                    {diff !== null && (
                      <span className={`weight-diff ${diff >= 0 ? "diff-pos" : "diff-neg"}`}>
                        {diff >= 0 ? "+" : ""}
                        {diff} g
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
