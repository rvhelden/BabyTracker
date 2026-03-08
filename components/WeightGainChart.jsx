"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { parsePlainDate } from "../lib/temporal.js";
import { useLocale } from "./LocaleContext.jsx";

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
      <p style={{ color: "var(--text-muted)", marginBottom: 2 }}>
        {d.weight_grams} g ({(d.weight_grams / 1000).toFixed(3)} kg)
      </p>
      <p
        style={{
          fontWeight: 600,
          color: d.gain >= 0 ? "var(--success)" : "var(--danger)",
        }}
      >
        {d.gain >= 0 ? "+" : ""}
        {d.gain} g vs previous
      </p>
      {d.notes && <p style={{ color: "var(--text-muted)", marginTop: 2 }}>{d.notes}</p>}
    </div>
  );
}

export default function WeightGainChart({ weights }) {
  const locale = useLocale()?.locale;

  const sorted = [...weights].sort((a, b) => a.measured_at.localeCompare(b.measured_at));

  const data = sorted.slice(1).map((w, i) => {
    const prev = sorted[i];
    return {
      ...w,
      gain: w.weight_grams - prev.weight_grams,
      label:
        parsePlainDate(w.measured_at)?.toLocaleString(locale || undefined, {
          month: "short",
          day: "numeric",
        }) || w.measured_at,
    };
  });

  if (data.length === 0) {
    return <p className='chart-empty'>Add at least 2 measurements to see gains.</p>;
  }

  const absMax = Math.max(...data.map((d) => Math.abs(d.gain)), 1);
  const domainMax = Math.ceil(absMax * 1.2);

  return (
    <div style={{ width: "100%", minHeight: 260 }}>
      <ResponsiveContainer height={260}>
        <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='var(--chart-grid)' />
          <XAxis
            dataKey='label'
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            interval={0}
            angle={data.length > 6 ? -35 : 0}
            textAnchor={data.length > 6 ? "end" : "middle"}
            height={data.length > 6 ? 48 : 24}
          />
          <YAxis
            domain={[-domainMax, domainMax]}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v} g`}
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            width={70}
          />
          <ReferenceLine y={0} stroke='var(--border)' strokeWidth={2} />
          <Tooltip content={<CustomTooltip locale={locale} />} />
          <Bar dataKey='gain' radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.id}
                fill={entry.gain >= 0 ? "var(--success)" : "var(--danger)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
