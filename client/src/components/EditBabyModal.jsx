import React, { useState } from 'react';
import { api } from '../api';
import Modal from './Modal';

export default function EditBabyModal({ baby, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: baby.name, birth_date: baby.birth_date, gender: baby.gender || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const updated = await api.babies.update(baby.id, form);
      onUpdated(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal title="Edit Baby" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
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
          <label>Gender</label>
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
            {loading ? <span className="spinner" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
