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
import { useLocale } from "./LocaleContext.jsx";

function daysSinceBirth(birthDate, measured_at) {
  const birth = parsePlainDate(birthDate);
  const date = parsePlainDate(measured_at);
  return birth && date ? Math.floor(daysBetween(birth, date)) : 0;
}

function CustomTooltip({ active, payload, locale }) {
  if (!active || !payload?.length) {
    return null;
  }
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
      <p style={{ fontWeight: 700, marginBottom: 2 }}>
        {parsePlainDate(d.measured_at)?.toLocaleString(locale || undefined, {
          dateStyle: "medium",
        }) || d.measured_at}
      </p>
      <p style={{ color: "var(--primary-dark)" }}>
        {d.weight_grams} g ({(d.weight_grams / 1000).toFixed(3)} kg)
      </p>
      {d.notes && <p style={{ color: "var(--text-muted)", marginTop: 2 }}>{d.notes}</p>}
    </div>
  );
}

export default function WeightChart({ weights, birthDate }) {
  const STEP_KG = 0.02;
  const locale = useLocale()?.locale;
  const data = weights.map((w) => ({
    ...w,
    day: daysSinceBirth(birthDate, w.measured_at),
    kg: w.weight_grams / 1000,
  }));

  const minRaw = Math.min(...data.map((d) => d.kg));
  const maxRaw = Math.max(...data.map((d) => d.kg));
  const paddedMin = Math.max(0, minRaw - STEP_KG * 2);
  const paddedMax = maxRaw + STEP_KG * 2;
  const minKg = Math.floor(paddedMin / STEP_KG) * STEP_KG;
  const maxKg = Math.ceil(paddedMax / STEP_KG) * STEP_KG;
  const domainMax = maxKg <= minKg ? minKg + STEP_KG * 2 : maxKg;

  function formatDay(day) {
    if (day < 30) {
      return `Day ${day}`;
    }
    const months = Math.floor(day / 30.44);
    return `${months}m`;
  }

  return (
    <div style={{ width: "100%", minHeight: 300 }}>
      <ResponsiveContainer height={300}>
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
            domain={[minKg, domainMax]}
            tickFormatter={(v) => `${v.toFixed(2)} kg`}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            width={65}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Line
            type='linear'
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
