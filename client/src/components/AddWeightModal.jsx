import React, { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

export default function AddWeightModal({ babyId, onClose, onAdded }) {
  const [form, setForm] = useState({
    weight_grams: '',
    measured_at: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const entry = await api.weights.add(babyId, {
        weight_grams: parseInt(form.weight_grams),
        measured_at: form.measured_at,
        notes: form.notes || undefined
      });
      onAdded(entry);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Weight Entry" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={form.measured_at}
            onChange={e => setForm(f => ({ ...f, measured_at: e.target.value }))}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="form-group">
          <label>Weight (grams)</label>
          <input
            type="number"
            placeholder="e.g. 3500"
            value={form.weight_grams}
            onChange={e => setForm(f => ({ ...f, weight_grams: e.target.value }))}
            required
            min="100"
            max="50000"
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Notes (optional)</label>
          <input
            type="text"
            placeholder="e.g. After feeding"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </div>
        {error && <p className="error-msg">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
