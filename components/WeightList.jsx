"use client";

import { useState, useEffect, useActionState } from "react";
import { deleteWeightAction, updateWeightAction } from "../app/actions.js";

function formatDateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function EditForm({ entry, babyId, onDone }) {
  const boundUpdate = updateWeightAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success]);

  return (
    <div className='weight-edit-form'>
      <form action={action}>
        <div className='form-group'>
          <label>Date</label>
          <input type='date' name='measured_at' defaultValue={entry.measured_at} />
        </div>
        <div className='form-group'>
          <label>Weight (grams)</label>
          <input
            type='number'
            name='weight_grams'
            defaultValue={entry.weight_grams}
            min='100'
            max='50000'
          />
        </div>
        <div className='form-group' style={{ marginBottom: 0 }}>
          <label>Notes</label>
          <input
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

export default function WeightList({ weights, babyId, onMutated }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteWeightAction(babyId, id);
      if (result?.error) alert(result.error);
      else onMutated();
    } finally {
      setDeleting(null);
    }
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

        return (
          <div key={w.id} className='weight-card'>
            <div className='weight-card-body'>
              <div className='weight-row-main'>
                <div className='weight-card-left'>
                  <div className='weight-date'>{formatDateLabel(w.measured_at)}</div>
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
              <div className='weight-row-actions'>
                <button
                  className='maction-btn'
                  onClick={() => setEditing(w.id)}
                  aria-label='Edit entry'
                >
                  ✏️
                </button>
                <button
                  className='maction-btn danger'
                  onClick={() => handleDelete(w.id)}
                  disabled={deleting === w.id}
                  aria-label='Delete entry'
                >
                  {deleting === w.id ? (
                    <span className='spinner' style={{ borderTopColor: "var(--danger)" }} />
                  ) : (
                    "🗑️"
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
