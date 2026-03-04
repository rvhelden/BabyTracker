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
import { daysBetween, parsePlainDate } from "../lib/temporal.js";

function daysSinceBirth(birthDate, measured_at) {
  const birth = parsePlainDate(birthDate);
  const date = parsePlainDate(measured_at);
  return birth && date ? Math.floor(daysBetween(birth, date)) : 0;
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
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
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{d.measured_at}</p>
      <p style={{ color: "var(--primary-dark)" }}>
        {d.weight_grams} g ({(d.weight_grams / 1000).toFixed(3)} kg)
      </p>
      {d.notes && <p style={{ color: "var(--text-muted)", marginTop: 2 }}>{d.notes}</p>}
    </div>
  );
}

export default function WeightChart({ weights, birthDate }) {
  const data = weights.map((w) => ({
    ...w,
    day: daysSinceBirth(birthDate, w.measured_at),
    kg: parseFloat((w.weight_grams / 1000).toFixed(3)),
  }));

  const minKg = Math.max(0, Math.min(...data.map((d) => d.kg)) - 0.1);
  const maxKg = Math.max(...data.map((d) => d.kg)) + 0.1;

  function formatDay(day) {
    if (day < 30) return `Day ${day}`;
    const months = Math.floor(day / 30.44);
    return `${months}m`;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--chart-grid)' />
          <XAxis
            dataKey='day'
            tickFormatter={formatDay}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            label={{
              value: "Age",
              position: "insideBottomRight",
              offset: -5,
              fontSize: 12,
              fill: "var(--text-muted)",
            }}
          />
          <YAxis
            domain={[minKg, maxKg]}
            tickFormatter={(v) => `${v.toFixed(1)} kg`}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type='monotone'
            dataKey='kg'
            stroke='var(--primary)'
            strokeWidth={2.5}
            dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--primary-dark)" }}
          />
          {data[0]?.day === 0 && (
            <ReferenceLine
              x={0}
              stroke='var(--accent)'
              strokeDasharray='4 2'
              label={{ value: "Birth", fontSize: 11, fill: "var(--accent)" }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
