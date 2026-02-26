import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import WeightChart from '../components/WeightChart';
import WeightList from '../components/WeightList';
import AddWeightModal from '../components/AddWeightModal';
import InviteModal from '../components/InviteModal';
import EditBabyModal from '../components/EditBabyModal';
import './BabyDetail.css';

function ageLabel(birthDate) {
  const birth = new Date(birthDate);
  const now = new Date();
  const days = Math.floor((now - birth) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} old`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} month${months !== 1 ? 's' : ''} old`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} old`;
}

function genderIcon(gender) {
  if (gender === 'male') return '👦';
  if (gender === 'female') return '👧';
  return '🍼';
}

export default function BabyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [baby, setBaby] = useState(null);
  const [weights, setWeights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add-weight' | 'invite' | 'edit'

  useEffect(() => {
    Promise.all([api.babies.get(id), api.weights.list(id)])
      .then(([b, w]) => { setBaby(b); setWeights(w); })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  function handleWeightAdded(entry) {
    setWeights(prev => [...prev, entry].sort((a, b) => a.measured_at.localeCompare(b.measured_at)));
    setModal(null);
  }

  function handleWeightDeleted(entryId) {
    setWeights(prev => prev.filter(w => w.id !== entryId));
  }

  function handleWeightUpdated(updated) {
    setWeights(prev => prev.map(w => w.id === updated.id ? updated : w).sort((a, b) => a.measured_at.localeCompare(b.measured_at)));
  }

  function handleBabyUpdated(updated) {
    setBaby(prev => ({ ...prev, ...updated }));
    setModal(null);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${baby.name}'s profile? This cannot be undone.`)) return;
    try {
      await api.babies.delete(id);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleLeave() {
    if (!window.confirm(`Remove yourself from ${baby.name}'s profile?`)) return;
    try {
      await api.babies.leave(id);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (!baby) return null;

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const firstWeight = weights.length > 0 ? weights[0] : null;
  const gainGrams = latestWeight && firstWeight && weights.length > 1
    ? latestWeight.weight_grams - firstWeight.weight_grams
    : null;

  return (
    <div className="baby-detail">
      <div className="back-link">
        <Link to="/">← All babies</Link>
      </div>

      <div className="baby-detail-header card">
        <div className="baby-detail-info">
          <div className="baby-detail-avatar">{genderIcon(baby.gender)}</div>
          <div>
            <h2>{baby.name}</h2>
            <p className="baby-detail-age">{ageLabel(baby.birth_date)} · Born {baby.birth_date}</p>
            <div className="baby-detail-parents">
              {baby.parents?.map(p => (
                <span key={p.id} className="parent-chip">
                  {p.name} <span className="parent-role">({p.role})</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="baby-detail-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('edit')}>Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setModal('invite')}>
            Share QR
          </button>
          {baby.role === 'owner'
            ? <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            : <button className="btn btn-secondary btn-sm" onClick={handleLeave}>Leave</button>
          }
        </div>
      </div>

      <div className="weight-summary">
        <div className="summary-card card">
          <div className="summary-label">Current Weight</div>
          <div className="summary-value">
            {latestWeight ? `${(latestWeight.weight_grams / 1000).toFixed(3)} kg` : '—'}
          </div>
          {latestWeight && <div className="summary-sub">{latestWeight.weight_grams} g · {latestWeight.measured_at}</div>}
        </div>
        <div className="summary-card card">
          <div className="summary-label">Birth Weight</div>
          <div className="summary-value">
            {firstWeight ? `${(firstWeight.weight_grams / 1000).toFixed(3)} kg` : '—'}
          </div>
          {firstWeight && <div className="summary-sub">{firstWeight.weight_grams} g · {firstWeight.measured_at}</div>}
        </div>
        <div className="summary-card card">
          <div className="summary-label">Total Gain</div>
          <div className={`summary-value ${gainGrams !== null && gainGrams >= 0 ? 'gain-positive' : ''}`}>
            {gainGrams !== null ? `${gainGrams >= 0 ? '+' : ''}${gainGrams} g` : '—'}
          </div>
          {gainGrams !== null && <div className="summary-sub">{weights.length} measurements</div>}
        </div>
      </div>

      <div className="card chart-card">
        <div className="section-header">
          <h3>Growth Chart</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('add-weight')}>
            + Add Weight
          </button>
        </div>
        {weights.length < 2 ? (
          <div className="chart-empty">
            <p>Add at least 2 weight measurements to see the growth chart.</p>
          </div>
        ) : (
          <WeightChart weights={weights} birthDate={baby.birth_date} />
        )}
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Weight History</h3>
        </div>
        <WeightList
          weights={weights}
          babyId={id}
          onDeleted={handleWeightDeleted}
          onUpdated={handleWeightUpdated}
        />
      </div>

      {modal === 'add-weight' && (
        <AddWeightModal babyId={id} onClose={() => setModal(null)} onAdded={handleWeightAdded} />
      )}
      {modal === 'invite' && (
        <InviteModal babyId={id} babyName={baby.name} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && (
        <EditBabyModal baby={baby} onClose={() => setModal(null)} onUpdated={handleBabyUpdated} />
      )}
    </div>
  );
}
