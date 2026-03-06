"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatLocalDate,
  parsePlainDate,
  parsePlainDateTime,
  todayPlainDate,
} from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";

function formatDayLabel(dateStr, locale) {
  const date = parsePlainDate(dateStr);
  if (!date) {
    return dateStr;
  }
  return date.toLocaleString(locale || undefined, { month: "short", day: "numeric" });
}

function CustomTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) {
    return null;
  }
  const d = payload[0].payload;
  const dayLabel = d.day ? formatLocalDate(parsePlainDate(d.day), locale) : d.day;
  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "0.6rem 1rem",
        boxShadow: "var(--shadow)",
        fontSize: "0.88rem",
      }}
    >
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{dayLabel}</p>
      <p style={{ color: "var(--primary-dark)" }}>{d.total_ml} ml total</p>
      {d.suggested_ml && (
        <p style={{ color: "var(--text-muted)", marginTop: 2 }}>Suggested {d.suggested_ml} ml</p>
      )}
      {d.max_ml && <p style={{ color: "var(--text-muted)" }}>Max {d.max_ml} ml</p>}
    </div>
  );
}

function normalizeDate(value) {
  const date = parsePlainDateTime(value)?.toPlainDate() || parsePlainDate(value);
  if (!date) {
    return null;
  }
  return date.toString();
}

function getLastDays(count) {
  const days = [];
  const today = todayPlainDate();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = today.subtract({ days: i });
    days.push(normalizeDate(d.toString()));
  }
  return days.filter(Boolean);
}

function expectedForDay(date, weights) {
  if (!weights.length) {
    return null;
  }
  const dayWeights = weights.filter((w) => normalizeDate(w.measured_at) === date);
  if (dayWeights.length > 0) {
    const latest = dayWeights[dayWeights.length - 1];
    return Math.round((latest.weight_grams / 1000) * 150);
  }
  const latestWeight = weights[weights.length - 1];
  return Math.round((latestWeight.weight_grams / 1000) * 150);
}

function maxForDay(date, weights) {
  if (!weights.length) {
    return null;
  }
  const dayWeights = weights.filter((w) => normalizeDate(w.measured_at) === date);
  if (dayWeights.length > 0) {
    const latest = dayWeights[dayWeights.length - 1];
    return Math.round((latest.weight_grams / 1000) * 180);
  }
  const latestWeight = weights[weights.length - 1];
  return Math.round((latestWeight.weight_grams / 1000) * 180);
}

export default function MilkChart({ entries, weights }) {
  const locale = useLocale()?.locale;
  const daily = new Map();
  entries.forEach((entry) => {
    const day = normalizeDate(entry.fed_at);
    if (!day) {
      return;
    }
    const current = daily.get(day) || 0;
    daily.set(day, current + entry.volume_ml);
  });

  const days = getLastDays(7);
  const data = days.map((day) => ({
    day,
    label: formatDayLabel(day, locale),
    total_ml: daily.get(day) || 0,
    suggested_ml: expectedForDay(day, weights),
    max_ml: maxForDay(day, weights),
  }));

  const maxTotal = data.length ? Math.max(...data.map((d) => d.total_ml)) : 0;
  const maxSuggested = data.length ? Math.max(...data.map((d) => d.suggested_ml || 0)) : 0;
  const maxRecommended = data.length ? Math.max(...data.map((d) => d.max_ml || 0)) : 0;
  const maxY = Math.max(maxTotal, maxSuggested, maxRecommended, 50);

  return (
    <div style={{ width: "100%", minHeight: 260 }}>
      <ResponsiveContainer height={260}>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--border)' />
          <XAxis dataKey='label' tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
          <YAxis
            domain={[0, maxY + 50]}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            width={65}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Line
            type='monotone'
            dataKey='total_ml'
            stroke='var(--primary)'
            strokeWidth={2.5}
            dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--primary-dark)" }}
          />
          <Line
            type='monotone'
            dataKey='suggested_ml'
            stroke='var(--accent)'
            strokeWidth={2}
            dot={false}
            strokeDasharray='5 4'
          />
          <Line
            type='monotone'
            dataKey='max_ml'
            stroke='var(--danger)'
            strokeWidth={2}
            dot={false}
            strokeDasharray='3 5'
          />
          {data.length > 0 && <ReferenceLine y={0} stroke='transparent' />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
