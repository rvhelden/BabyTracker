"use client";

import {
  formatDayKey,
  formatWeekdayShort,
  parsePlainDate,
  parsePlainDateTime,
  todayPlainDate,
} from "../lib/temporal.js";

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function dayKey(value) {
  const date = typeof value === "string" ? parsePlainDate(value) : value;
  if (!date) {
    return null;
  }
  return formatDayKey(date);
}

function getLastDays(count) {
  const days = [];
  const today = todayPlainDate();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = today.subtract({ days: i });
    days.push(dayKey(d));
  }
  return days.filter(Boolean);
}

export default function FeedingHourChart({ entries }) {
  const days = getLastDays(7);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const matrix = new Map();
  const todayKey = dayKey(todayPlainDate());

  entries.forEach((entry) => {
    const dateTime = parsePlainDateTime(entry.fed_at);
    if (!dateTime) {
      return;
    }
    const day = dayKey(dateTime.toPlainDate());
    if (!day) {
      return;
    }
    const key = `${day}-${dateTime.hour}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
  });

  const maxCount = Math.max(...Array.from(matrix.values()), 1);

  return (
    <div className='feed-matrix'>
      <div className='matrix-header'>
        <div className='matrix-corner' />
        {days.map((day) => {
          const label = formatWeekdayShort(parsePlainDate(day));
          const isToday = day === todayKey;
          return (
            <div key={day} className={`matrix-day${isToday ? " today" : ""}`}>
              {label}
            </div>
          );
        })}
      </div>
      <div className='matrix-body'>
        {hours.map((hour) => (
          <div key={hour} className='matrix-row'>
            <div className='matrix-hour'>{hourLabel(hour)}</div>
            {days.map((day) => {
              const count = matrix.get(`${day}-${hour}`) || 0;
              const intensity = count === 0 ? 0 : Math.min(0.15 + (count / maxCount) * 0.75, 0.9);
              return (
                <div
                  key={`${day}-${hour}`}
                  className='matrix-cell'
                  style={{ backgroundColor: `rgba(var(--primary-rgb), ${intensity})` }}
                  title={`${day} ${hourLabel(hour)}: ${count} feedings`}
                >
                  {count > 0 ? count : ""}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className='matrix-legend'>
        <span>Less</span>
        <div className='legend-bar'>
          <span
            className='legend-step'
            style={{ backgroundColor: "rgba(var(--primary-rgb), 0.2)" }}
          />
          <span
            className='legend-step'
            style={{ backgroundColor: "rgba(var(--primary-rgb), 0.4)" }}
          />
          <span
            className='legend-step'
            style={{ backgroundColor: "rgba(var(--primary-rgb), 0.6)" }}
          />
          <span
            className='legend-step'
            style={{ backgroundColor: "rgba(var(--primary-rgb), 0.85)" }}
          />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
