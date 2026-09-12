"use client";

/** Hand-rolled SVG radar chart for CORE dimensions (5–9 axes, values 0–10). */

interface Props {
  data: Record<string, number>;
  max?: number;
  color?: string;
  size?: number;
}

export function RadarChart({ data, max = 10, color = "#5b8cff", size = 280 }: Props) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 46;

  const pt = (i: number, fraction: number): [number, number] => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = fraction * R;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [0.25, 0.5, 0.75, 1].map((f) =>
    Array.from({ length: n }, (_, i) => pt(i, f).join(",")).join(" "),
  );
  const valuePoints = Array.from({ length: n }, (_, i) =>
    pt(i, Math.max(0, Math.min(1, values[i] / max))).join(","),
  ).join(" ");

  const ringId = "radar-ring";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {rings.map((r, i) => (
        <polygon key={i} points={r} fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.18)" />;
      })}
      <polygon points={valuePoints} fill={`url(#${ringId})`} stroke={color} strokeWidth="2" />
      {Array.from({ length: n }, (_, i) => {
        const [x, y] = pt(i, Math.max(0, Math.min(1, values[i] / max)));
        return <circle key={i} cx={x} cy={y} r="3" fill={color} stroke="#0b1020" strokeWidth="1.5" />;
      })}
      {labels.map((label, i) => {
        const [x, y] = pt(i, 1.18);
        const short = label.split("-")[0];
        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400"
            style={{ fontSize: 10 }}
          >
            {short}
          </text>
        );
      })}
    </svg>
  );
}