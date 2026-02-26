import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import AddBabyModal from '../components/AddBabyModal';
import './Dashboard.css';

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

export default function Dashboard() {
  const [babies, setBabies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    api.babies.list()
      .then(setBabies)
      .finally(() => setLoading(false));
  }, []);

  function handleAdded(baby) {
    setBabies(prev => [baby, ...prev]);
    setShowAdd(false);
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>My Babies</h2>
          <p className="subtitle">Track growth and milestones</p>
        </div>
      </div>

      {babies.length === 0 ? (
        <div className="empty-state card">
          <div className="empty-icon">🍼</div>
          <h3>No babies yet</h3>
          <p>Tap the + button to add your first baby.</p>
        </div>
      ) : (
        <div className="babies-grid">
          {babies.map(baby => (
            <Link key={baby.id} to={`/baby/${baby.id}`} className="baby-card card">
              <div className="baby-card-top">
                <div className="baby-avatar">{genderIcon(baby.gender)}</div>
                <div className="baby-info">
                  <h3>{baby.name}</h3>
                  <span className="baby-age">{ageLabel(baby.birth_date)}</span>
                </div>
                <span className={`badge ${baby.role === 'owner' ? 'badge-blue' : 'badge-green'}`}>
                  {baby.role}
                </span>
              </div>
              <div className="baby-stats">
                {baby.latest_weight ? (
                  <div className="stat">
                    <span className="stat-label">Latest weight</span>
                    <span className="stat-value">{(baby.latest_weight / 1000).toFixed(2)} kg</span>
                    <span className="stat-sub">{baby.latest_weight_date}</span>
                  </div>
                ) : (
                  <div className="stat no-data">No weight entries yet</div>
                )}
                <div className="stat">
                  <span className="stat-label">Parents</span>
                  <span className="stat-value">{baby.parent_count}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add baby">
        +
      </button>

      {showAdd && <AddBabyModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
    </div>
  );
}
