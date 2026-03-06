"use client";

import { formatWeekdayShort, parsePlainDateTime, todayPlainDate } from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
}

function getLastDays(count) {
  const days = new Set();
  const today = todayPlainDate();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = today.subtract({ days: i });
    days.add(d.toString());
  }
  return days;
}

export default function FeedingHourChart({ entries }) {
  const locale = useLocale()?.locale;
  const days = getLastDays(30);
  const weekdays = [1, 2, 3, 4, 5, 6, 7];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const matrix = new Map();

  entries.forEach((entry) => {
    const dateTime = parsePlainDateTime(entry.fed_at);
    if (!dateTime) {
      return;
    }
    const day = dateTime.toPlainDate().toString();
    if (!days.has(day)) {
      return;
    }
    const weekday = dateTime.dayOfWeek;
    const key = `${weekday}-${dateTime.hour}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
  });

  const maxCount = Math.max(...Array.from(matrix.values()), 1);

  return (
    <div className='feed-matrix'>
      <div className='matrix-header'>
        <div className='matrix-corner' />
        {weekdays.map((weekday) => {
          const sampleDate = todayPlainDate().subtract({
            days: (todayPlainDate().dayOfWeek - weekday + 7) % 7,
          });
          const label = formatWeekdayShort(sampleDate, locale);
          return (
            <div key={weekday} className='matrix-day'>
              {label}
            </div>
          );
        })}
      </div>
      <div className='matrix-body'>
        {hours.map((hour) => (
          <div key={hour} className='matrix-row'>
            <div className='matrix-hour'>{hourLabel(hour)}</div>
            {weekdays.map((weekday) => {
              const count = matrix.get(`${weekday}-${hour}`) || 0;
              const intensity = count === 0 ? 0 : Math.min(0.15 + (count / maxCount) * 0.75, 0.9);
              return (
                <div
                  key={`${weekday}-${hour}`}
                  className='matrix-cell'
                  style={{ backgroundColor: `rgba(var(--primary-rgb), ${intensity})` }}
                  title={`${labelForWeekday(weekday, locale)} ${hourLabel(hour)}: ${count} feedings (last 30 days)`}
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

function labelForWeekday(weekday, locale) {
  const today = todayPlainDate();
  const sampleDate = today.subtract({ days: (today.dayOfWeek - weekday + 7) % 7 });
  return formatWeekdayShort(sampleDate, locale);
}
