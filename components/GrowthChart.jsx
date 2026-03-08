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
  const isEnglish = (locale || "").toLowerCase().startsWith("en");
  const lengthLabel =
    Number.isFinite(d.length_cm) && d.length_cm > 0
      ? isEnglish
        ? `${(d.length_cm / 2.54).toFixed(2)} in`
        : `${d.length_cm.toFixed(1)} cm`
      : "—";

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
        {d.weight_grams != null
          ? `${d.weight_grams} g (${(d.weight_grams / 1000).toFixed(3)} kg)`
          : "—"}
      </p>
      <p style={{ color: "var(--accent)", marginTop: 2 }}>Length: {lengthLabel}</p>
      {d.notes && <p style={{ color: "var(--text-muted)", marginTop: 2 }}>{d.notes}</p>}
    </div>
  );
}

export default function GrowthChart({ entries, birthDate }) {
  const STEP_KG = 0.02;
  const locale = useLocale()?.locale;
  const data = entries.map((w) => ({
    ...w,
    day: daysSinceBirth(birthDate, w.measured_at),
    kg: Number.isFinite(w.weight_grams) ? w.weight_grams / 1000 : null,
    length_display: Number.isFinite(w.length_cm)
      ? (locale || "").toLowerCase().startsWith("en")
        ? w.length_cm / 2.54
        : w.length_cm
      : null,
  }));

  if (data.length === 0) {
    return null;
  }

  const weightValues = data.map((d) => d.kg).filter((v) => Number.isFinite(v));
  const lengthValues = data.map((d) => d.length_display).filter((v) => Number.isFinite(v));

  const minRaw = weightValues.length ? Math.min(...weightValues) : 0;
  const maxRaw = weightValues.length ? Math.max(...weightValues) : 1;
  const paddedMin = Math.max(0, minRaw - STEP_KG * 2);
  const paddedMax = maxRaw + STEP_KG * 2;
  const minKg = Math.floor(paddedMin / STEP_KG) * STEP_KG;
  const maxKg = Math.ceil(paddedMax / STEP_KG) * STEP_KG;
  const domainMax = maxKg <= minKg ? minKg + STEP_KG * 2 : maxKg;

  const lengthMin = lengthValues.length ? Math.floor((Math.min(...lengthValues) - 1) * 2) / 2 : 0;
  const lengthMax = lengthValues.length ? Math.ceil((Math.max(...lengthValues) + 1) * 2) / 2 : 10;
  const lengthUnit = (locale || "").toLowerCase().startsWith("en") ? "in" : "cm";

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
          <YAxis
            yAxisId='length'
            orientation='right'
            domain={[lengthMin, lengthMax]}
            tickFormatter={(v) => `${v.toFixed(1)} ${lengthUnit}`}
            tick={{ fontSize: 12, fill: "var(--text-muted)" }}
            width={72}
          />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Line
            type='linear'
            dataKey='kg'
            stroke='var(--primary)'
            strokeWidth={2.5}
            dot={{ fill: "var(--primary)", r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: "var(--primary-dark)" }}
            connectNulls
          />
          <Line
            type='linear'
            dataKey='length_display'
            yAxisId='length'
            stroke='var(--accent)'
            strokeWidth={2.25}
            dot={{ fill: "var(--accent)", r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "var(--accent)" }}
            connectNulls
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
