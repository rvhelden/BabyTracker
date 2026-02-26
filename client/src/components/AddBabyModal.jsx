import React, { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

export default function AddBabyModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', birth_date: '', gender: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const baby = await api.babies.create(form);
      onAdded(baby);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Add Baby" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Baby's Name</label>
          <input
            type="text"
            placeholder="e.g. Emma"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            autoFocus
          />
        </div>
        <div className="form-group">
          <label>Date of Birth</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
            required
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="form-group">
          <label>Gender (optional)</label>
          <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
            <option value="">Prefer not to say</option>
            <option value="female">Girl</option>
            <option value="male">Boy</option>
          </select>
        </div>
        {error && <p className="error-msg">{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : 'Add Baby'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
