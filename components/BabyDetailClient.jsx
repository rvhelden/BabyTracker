'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBabyAction, leaveBabyAction } from '../app/actions.js';
import WeightChart from './WeightChart.jsx';
import WeightList from './WeightList.jsx';
import AddWeightModal from './AddWeightModal.jsx';
import InviteModal from './InviteModal.jsx';
import EditBabyModal from './EditBabyModal.jsx';

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

export default function BabyDetailClient({ baby, weights }) {
  const [modal, setModal] = useState(null); // 'add-weight' | 'invite' | 'edit'
  const router = useRouter();
  const [, startTransition] = useTransition();

  const latestWeight = weights.length > 0 ? weights[weights.length - 1] : null;
  const firstWeight  = weights.length > 0 ? weights[0] : null;
  const gainGrams = latestWeight && firstWeight && weights.length > 1
    ? latestWeight.weight_grams - firstWeight.weight_grams
    : null;

  function handleMutated() {
    setModal(null);
    router.refresh();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${baby.name}'s profile? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteBabyAction(baby.id);
      if (result?.error) alert(result.error);
    });
  }

  async function handleLeave() {
    if (!window.confirm(`Remove yourself from ${baby.name}'s profile?`)) return;
    startTransition(async () => {
      const result = await leaveBabyAction(baby.id);
      if (result?.error) alert(result.error);
    });
  }

  return (
    <div className="baby-detail">
      {/* Hero card */}
      <div className="baby-hero card">
        <div className="baby-hero-main">
          <div className="baby-detail-avatar">{genderIcon(baby.gender)}</div>
          <div className="baby-hero-text">
            <h2>{baby.name}</h2>
            <p className="baby-detail-age">{ageLabel(baby.birth_date)}</p>
            <p className="baby-born">Born {baby.birth_date}</p>
          </div>
        </div>
        <div className="baby-detail-parents">
          {baby.parents?.map(p => (
            <span key={p.id} className="parent-chip">
              {p.name} <span className="parent-role">· {p.role}</span>
            </span>
          ))}
        </div>
        <div className="baby-action-row">
          <button className="baby-action-btn" onClick={() => setModal('edit')}>
            <span>✏️</span> Edit
          </button>
          <button className="baby-action-btn" onClick={() => setModal('invite')}>
            <span>📲</span> Share
          </button>
          {baby.role === 'owner'
            ? <button className="baby-action-btn danger" onClick={handleDelete}><span>🗑️</span> Delete</button>
            : <button className="baby-action-btn" onClick={handleLeave}><span>👋</span> Leave</button>
          }
        </div>
      </div>

      {/* Summary stats */}
      <div className="weight-summary">
        <div className="summary-card card">
          <div className="summary-label">Current</div>
          <div className="summary-value">
            {latestWeight ? `${(latestWeight.weight_grams / 1000).toFixed(2)} kg` : '—'}
          </div>
          {latestWeight && <div className="summary-sub">{latestWeight.weight_grams} g</div>}
        </div>
        <div className="summary-card card">
          <div className="summary-label">At birth</div>
          <div className="summary-value">
            {firstWeight ? `${(firstWeight.weight_grams / 1000).toFixed(2)} kg` : '—'}
          </div>
          {firstWeight && <div className="summary-sub">{firstWeight.weight_grams} g</div>}
        </div>
        <div className="summary-card card">
          <div className="summary-label">Gained</div>
          <div className={`summary-value ${gainGrams !== null && gainGrams >= 0 ? 'gain-positive' : ''}`}>
            {gainGrams !== null ? `${gainGrams >= 0 ? '+' : ''}${gainGrams} g` : '—'}
          </div>
          {weights.length > 1 && <div className="summary-sub">{weights.length} entries</div>}
        </div>
      </div>

      {/* Chart */}
      <div className="chart-card card">
        <div className="section-header">
          <h3>Growth Chart</h3>
        </div>
        {weights.length > 0
          ? <WeightChart weights={weights} birthDate={baby.birth_date} />
          : <p className="chart-empty">No weight entries yet.</p>}
      </div>

      {/* History */}
      <div className="history-card card">
        <div className="section-header">
          <h3>Weight History</h3>
        </div>
        <WeightList weights={weights} babyId={baby.id} onMutated={handleMutated} />
      </div>

      <button className="fab" onClick={() => setModal('add-weight')} aria-label="Add weight">+</button>

      {modal === 'add-weight' && (
        <AddWeightModal babyId={baby.id} onClose={() => setModal(null)} onAdded={handleMutated} />
      )}
      {modal === 'invite' && (
        <InviteModal babyId={baby.id} babyName={baby.name} onClose={() => setModal(null)} />
      )}
      {modal === 'edit' && (
        <EditBabyModal baby={baby} onClose={() => setModal(null)} onUpdated={handleMutated} />
      )}
    </div>
  );
}
