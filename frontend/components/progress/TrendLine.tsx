"use client";

import type { ProgressTrendPoint } from "@/lib/types";

/** Multi-line SVG trend for readiness (+ recovery when available). */
export function TrendLine({ trend, height = 140 }: { trend: ProgressTrendPoint[]; height?: number }) {
  const width = 560;
  const pad = { l: 30, r: 12, t: 12, b: 22 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (trend.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-slate-500">
        Complete a session to see your trend.
      </div>
    );
  }

  const x = (i: number) => pad.l + (i / Math.max(1, trend.length - 1)) * innerW;
  const y = (v: number) => pad.t + innerH - (v / 10) * innerH;

  const linePath = (get: (p: ProgressTrendPoint) => number | null | undefined) =>
    trend
      .map((p, i) => {
        const v = get(p);
        return v == null ? null : `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="max-w-full">
      {[0, 2.5, 5, 7.5, 10].map((v) => (
        <g key={v}>
          <line x1={pad.l} y1={y(v)} x2={width - pad.r} y2={y(v)} stroke="rgba(148,163,184,0.14)" strokeDasharray="3 3" />
          <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" className="fill-slate-500" style={{ fontSize: 9 }}>
            {v}
          </text>
        </g>
      ))}
      {trend.map((p, i) => (
        <text key={i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-slate-500" style={{ fontSize: 9 }}>
          {p.label}
        </text>
      ))}
      <path d={linePath((p) => p.readiness)} fill="none" stroke="#5b8cff" strokeWidth="2.5" strokeLinecap="round" />
      {trend.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.readiness)} r="3" fill="#5b8cff" />
      ))}
      {trend.some((p) => p.recovery != null) && (
        <>
          <path d={linePath((p) => p.recovery)} fill="none" stroke="#3dd68c" strokeWidth="2" strokeLinecap="round" />
          {trend.map((p, i) =>
            p.recovery == null ? null : <circle key={i} cx={x(i)} cy={y(p.recovery)} r="2.5" fill="#3dd68c" />,
          )}
        </>
      )}
      <line x1={pad.l} y1={y(0)} x2={pad.l} y2={y(10)} stroke="rgba(148,163,184,0.25)" />
    </svg>
  );
}