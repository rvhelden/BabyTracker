'use client';

import { useState, useEffect, useActionState } from 'react';
import { deleteMilkAction, updateMilkAction } from '../app/actions.js';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  const hh = `${date.getHours()}`.padStart(2, '0');
  const min = `${date.getMinutes()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function EditForm({ entry, babyId, onDone }) {
  const boundUpdate = updateMilkAction.bind(null, babyId, entry.id);
  const [state, action, pending] = useActionState(boundUpdate, null);

  useEffect(() => {
    if (state?.success) onDone();
  }, [state?.success]);

  const defaultDateTime = entry.fed_at?.includes('T')
    ? entry.fed_at
    : entry.fed_at?.replace(' ', 'T');

  return (
    <div className="milk-edit-form">
      <form action={action}>
        <div className="form-group">
          <label>Time</label>
          <input type="datetime-local" name="fed_at" defaultValue={defaultDateTime} />
        </div>
        <div className="form-group">
          <label>Amount (ml)</label>
          <input type="number" name="volume_ml" defaultValue={entry.volume_ml} min="5" max="2000" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Notes</label>
          <input type="text" name="notes" placeholder="Optional note…" defaultValue={entry.notes || ''} />
        </div>
        {state?.error && <p className="error-msg">{state.error}</p>}
        <div className="milk-edit-actions">
          <button type="button" className="btn btn-secondary" onClick={onDone}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MilkList({ entries, babyId, onMutated }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      const result = await deleteMilkAction(babyId, id);
      if (result?.error) alert(result.error);
      else onMutated();
    } finally {
      setDeleting(null);
    }
  }

  if (entries.length === 0) {
    return <p className="milk-empty">No feedings yet. Tap + to add one.</p>;
  }

  const sorted = [...entries].sort((a, b) => b.fed_at.localeCompare(a.fed_at));
  const grouped = sorted.reduce((acc, entry) => {
    const day = formatDay(entry.fed_at);
    if (!acc.has(day)) acc.set(day, []);
    acc.get(day).push(entry);
    return acc;
  }, new Map());

  return (
    <div className="milk-list">
      {Array.from(grouped.entries()).map(([day, dayEntries]) => (
        <div key={day} className="milk-day">
          <div className="milk-day-header">
            <span>{day}</span>
            <span>{dayEntries.reduce((sum, entry) => sum + entry.volume_ml, 0)} ml</span>
          </div>
          <div className="milk-day-entries">
            {dayEntries.map(entry => {
              if (editing === entry.id) {
                return (
                  <div key={entry.id} className="milk-card editing">
                    <EditForm
                      entry={entry}
                      babyId={babyId}
                      onDone={() => { setEditing(null); onMutated(); }}
                    />
                  </div>
                );
              }

              return (
                <div key={entry.id} className="milk-card">
                  <div className="milk-card-body">
                    <div className="milk-card-left">
                      <div className="milk-date">{formatDateTime(entry.fed_at)}</div>
                      {entry.notes && <div className="milk-notes">{entry.notes}</div>}
                    </div>
                    <div className="milk-card-mid">
                      <div className="milk-ml">{entry.volume_ml} ml</div>
                    </div>
                  </div>
                  <div className="milk-card-actions">
                    <button className="maction-btn" onClick={() => setEditing(entry.id)}>✏️ Edit</button>
                    <button
                      className="maction-btn danger"
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                    >
                      {deleting === entry.id ? <span className="spinner" style={{ borderTopColor: 'var(--danger)' }} /> : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
