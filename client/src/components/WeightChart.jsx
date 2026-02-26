import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

function daysSinceBirth(birthDate, measured_at) {
  const birth = new Date(birthDate);
  const date = new Date(measured_at);
  return Math.floor((date - birth) / (1000 * 60 * 60 * 24));
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #dde3ed',
      borderRadius: 8,
      padding: '0.6rem 1rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
      fontSize: '0.88rem'
    }}>
      <p style={{ fontWeight: 700, marginBottom: 2 }}>{d.measured_at}</p>
      <p style={{ color: '#6c8ebf' }}>{d.weight_grams} g ({(d.weight_grams / 1000).toFixed(3)} kg)</p>
      {d.notes && <p style={{ color: '#718096', marginTop: 2 }}>{d.notes}</p>}
    </div>
  );
}

export default function WeightChart({ weights, birthDate }) {
  const data = weights.map(w => ({
    ...w,
    day: daysSinceBirth(birthDate, w.measured_at),
    kg: parseFloat((w.weight_grams / 1000).toFixed(3))
  }));

  const minKg = Math.max(0, Math.min(...data.map(d => d.kg)) - 0.1);
  const maxKg = Math.max(...data.map(d => d.kg)) + 0.1;

  function formatDay(day) {
    if (day < 30) return `Day ${day}`;
    const months = Math.floor(day / 30.44);
    return `${months}m`;
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis
            dataKey="day"
            tickFormatter={formatDay}
            tick={{ fontSize: 12, fill: '#718096' }}
            label={{ value: 'Age', position: 'insideBottomRight', offset: -5, fontSize: 12, fill: '#718096' }}
          />
          <YAxis
            domain={[minKg, maxKg]}
            tickFormatter={v => `${v.toFixed(1)} kg`}
            tick={{ fontSize: 12, fill: '#718096' }}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="#6c8ebf"
            strokeWidth={2.5}
            dot={{ fill: '#6c8ebf', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4a6fa5' }}
          />
          {data[0]?.day === 0 && (
            <ReferenceLine x={0} stroke="#f5a623" strokeDasharray="4 2" label={{ value: 'Birth', fontSize: 11, fill: '#f5a623' }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
