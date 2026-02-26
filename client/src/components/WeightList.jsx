import React, { useState } from 'react';
import { api } from '../api';
import './WeightList.css';

function EditRow({ entry, babyId, onUpdated, onCancel }) {
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
    <tr className="edit-row">
      <td>
        <input type="date" value={form.measured_at} onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))} />
      </td>
      <td>
        <input type="number" value={form.weight_grams} min="100" max="50000"
          onChange={e => setForm(f => ({ ...f, weight_grams: parseInt(e.target.value) }))} />
      </td>
      <td>
        <input type="text" placeholder="Notes..." value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </td>
      <td>
        <div className="row-actions">
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={loading}>Save</button>
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
        </div>
      </td>
    </tr>
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
    return <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>No weight entries yet.</p>;
  }

  const sorted = [...weights].sort((a, b) => b.measured_at.localeCompare(a.measured_at));

  return (
    <div className="weight-table-wrap">
      <table className="weight-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Weight</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((w, idx) => {
            if (editing === w.id) {
              return (
                <EditRow
                  key={w.id}
                  entry={w}
                  babyId={babyId}
                  onUpdated={(u) => { onUpdated(u); setEditing(null); }}
                  onCancel={() => setEditing(null)}
                />
              );
            }
            const prev = sorted[idx + 1];
            const diff = prev ? w.weight_grams - prev.weight_grams : null;
            return (
              <tr key={w.id}>
                <td>{w.measured_at}</td>
                <td>
                  <span className="weight-val">{w.weight_grams} g</span>
                  <span className="weight-kg"> ({(w.weight_grams / 1000).toFixed(3)} kg)</span>
                  {diff !== null && (
                    <span className={`weight-diff ${diff >= 0 ? 'diff-pos' : 'diff-neg'}`}>
                      {diff >= 0 ? '+' : ''}{diff} g
                    </span>
                  )}
                </td>
                <td className="notes-cell">{w.notes || <span className="text-muted">—</span>}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(w.id)}>Edit</button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(w.id)}
                      disabled={deleting === w.id}
                    >
                      {deleting === w.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
