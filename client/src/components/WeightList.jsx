import React, { useState } from 'react';
import { api } from '../api';
import './WeightList.css';

function EditForm({ entry, babyId, onUpdated, onCancel }) {
  const [form, setForm] = useState({
    weight_grams: entry.weight_grams,
    measured_at: entry.measured_at,
    notes: entry.notes || ''
  });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const updated = await api.weights.update(babyId, entry.id, form);
      onUpdated(updated);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="weight-edit-form">
      <div className="form-group">
        <label>Date</label>
        <input type="date" value={form.measured_at}
          onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))} />
      </div>
      <div className="form-group">
        <label>Weight (grams)</label>
        <input type="number" value={form.weight_grams} min="100" max="50000"
          onChange={e => setForm(f => ({ ...f, weight_grams: parseInt(e.target.value) }))} />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label>Notes</label>
        <input type="text" placeholder="Optional note…" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
      <div className="weight-edit-actions">
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Save'}
        </button>
      </div>
    </div>
  );
}

export default function WeightList({ weights, babyId, onDeleted, onUpdated }) {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function handleDelete(id) {
    setDeleting(id);
    try {
      await api.weights.delete(babyId, id);
      onDeleted(id);
    } finally {
      setDeleting(null);
    }
  }

  if (weights.length === 0) {
    return (
      <p className="weight-empty">No measurements yet. Tap + to add one.</p>
    );
  }

  const sorted = [...weights].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  return (
    <div className="weight-list">
      {sorted.map((w, idx) => {
        const prev = sorted[idx + 1];
        const diff = prev ? w.weight_grams - prev.weight_grams : null;

        if (editing === w.id) {
          return (
            <div key={w.id} className="weight-card editing">
              <EditForm
                entry={w}
                babyId={babyId}
                onUpdated={(u) => { onUpdated(u); setEditing(null); }}
                onCancel={() => setEditing(null)}
              />
            </div>
          );
        }

        return (
          <div key={w.id} className="weight-card">
            <div className="weight-card-body">
              <div className="weight-card-left">
                <div className="weight-date">{w.measured_at}</div>
                {w.notes && <div className="weight-notes">{w.notes}</div>}
              </div>
              <div className="weight-card-mid">
                <div className="weight-grams">{w.weight_grams} g</div>
                <div className="weight-kg">{(w.weight_grams / 1000).toFixed(3)} kg</div>
              </div>
              <div className="weight-card-right">
                {diff !== null && (
                  <span className={`weight-diff ${diff >= 0 ? 'diff-pos' : 'diff-neg'}`}>
                    {diff >= 0 ? '+' : ''}{diff} g
                  </span>
                )}
              </div>
            </div>
            <div className="weight-card-actions">
              <button className="waction-btn" onClick={() => setEditing(w.id)} aria-label="Edit entry">
                ✏️ Edit
              </button>
              <button className="waction-btn danger" onClick={() => handleDelete(w.id)}
                disabled={deleting === w.id} aria-label="Delete entry">
                {deleting === w.id ? '…' : '🗑️ Delete'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
