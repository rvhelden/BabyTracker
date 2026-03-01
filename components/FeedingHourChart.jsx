'use client';

function hourLabel(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function dayKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, '0');
  const dd = `${date.getDate()}`.padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function FeedingHourChart({ entries }) {
  const days = Array.from(new Set(entries.map(e => dayKey(e.fed_at)).filter(Boolean))).sort();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const matrix = new Map();

  entries.forEach(entry => {
    const day = dayKey(entry.fed_at);
    if (!day) return;
    const date = new Date(entry.fed_at);
    if (Number.isNaN(date.getTime())) return;
    const key = `${day}-${date.getHours()}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
  });

  const maxCount = Math.max(...Array.from(matrix.values()), 1);

  return (
    <div className="feed-matrix">
      <div className="matrix-header">
        <div className="matrix-corner" />
        {days.map(day => (
          <div key={day} className="matrix-day">{day}</div>
        ))}
      </div>
      <div className="matrix-body">
        {hours.map(hour => (
          <div key={hour} className="matrix-row">
            <div className="matrix-hour">{hourLabel(hour)}</div>
            {days.map(day => {
              const count = matrix.get(`${day}-${hour}`) || 0;
              const intensity = count === 0 ? 0 : Math.min(0.15 + (count / maxCount) * 0.75, 0.9);
              return (
                <div
                  key={`${day}-${hour}`}
                  className="matrix-cell"
                  style={{ backgroundColor: `rgba(var(--primary-rgb), ${intensity})` }}
                  title={`${day} ${hourLabel(hour)}: ${count} feedings`}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="matrix-legend">
        <span>Less</span>
        <div className="legend-bar">
          <span className="legend-step" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.2)' }} />
          <span className="legend-step" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.4)' }} />
          <span className="legend-step" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.6)' }} />
          <span className="legend-step" style={{ backgroundColor: 'rgba(var(--primary-rgb), 0.85)' }} />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
