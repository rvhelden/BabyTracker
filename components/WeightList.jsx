"use client";

import { useActionState, useEffect, useState } from "react";
import { deleteWeightAction, updateWeightAction } from "../app/actions.js";
import { formatLocalDate, parsePlainDate } from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";
import Modal from "./Modal.jsx";

function formatDateLabel(value, locale) {
  const date = parsePlainDate(value);
  if (!date) {
    return value;
  }
  return formatLocalDate(date, locale);
}

function EditForm({ entry, babyId, onDone, onDelete, deleting }) {
  const boundUpdate = updateWeightAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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

export default function WeightList({ weights, babyId, onMutated }) {
  const locale = useLocale()?.locale;
  const [dialogEntry, setDialogEntry] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteWeightAction(babyId, id);
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

  if (weights.length === 0) {
    return <p className='history-empty'>No measurements yet. Tap + to add one.</p>;
  }

  const sorted = [...weights].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const openDialogWeight = dialogEntry ? weights.find((w) => w.id === dialogEntry) : null;

  return (
    <div>
      {openDialogWeight && (
        <Modal title='Edit measurement' onClose={() => setDialogEntry(null)}>
          <EditForm
            entry={openDialogWeight}
            babyId={babyId}
            onDone={() => {
              setDialogEntry(null);
              onMutated();
            }}
            onDelete={() => handleDelete(openDialogWeight.id)}
            deleting={deleting === openDialogWeight.id}
          />
        </Modal>
      )}
      <div className='history-list'>
        {sorted.map((w, idx) => {
          const prev = sorted[idx + 1];
          const diff = prev ? w.weight_grams - prev.weight_grams : null;

          return (
            <button
              key={w.id}
              type='button'
              className='history-row'
              onClick={() => setDialogEntry(w.id)}
            >
              <span className='history-row-icon'>⚖️</span>
              <div className='history-row-body'>
                <div className='history-row-title'>
                  {formatDateLabel(w.measured_at, locale)}
                </div>
                {w.notes && <div className='history-row-sub'>{w.notes}</div>}
              </div>
              <div className='history-row-value'>
                <div className='history-row-primary'>{w.weight_grams} g</div>
                <div className='history-row-secondary'>
                  {(w.weight_grams / 1000).toFixed(3)} kg
                </div>
              </div>
              {diff !== null && (
                <div className='history-row-end'>
                  <span className={`history-badge ${diff >= 0 ? "pos" : "neg"}`}>
                    {diff >= 0 ? "+" : ""}
                    {diff} g
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
