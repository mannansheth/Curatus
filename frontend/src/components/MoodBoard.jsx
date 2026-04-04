import React, { useMemo } from "react";
import "./MoodBoard.css";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Smooth red(0) → yellow(5) → green(10)
function scoreToColor(score) {
  if (score === null) return "#2f2f2f";
  const t = Math.max(0, Math.min(10, score)) / 10;
  let r, g, b;
  if (t < 0.5) {
    const s = t / 0.5;
    r = 210;
    g = Math.round(35 + s * 175);
    b = 35;
  } else {
    const s = (t - 0.5) / 0.5;
    r = Math.round(210 - s * 165);
    g = Math.round(205 + s * 5);
    b = 35;
  }
  return `rgb(${r},${g},${b})`;
}

function MoodBoard({ data }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const grouped = useMemo(() => {
    const g = {};

    (data || []).forEach(item => {
      const dateObj = new Date(item.createdAt);

      const date =
        dateObj.getFullYear() +
        "-" +
        String(dateObj.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dateObj.getDate()).padStart(2, "0");
      if (!g[date]) g[date] = [];
      g[date].push(item);
    });
    return g;
  }, [data]);

  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const cells = useMemo(() => {
    const out = [];
    for (let i = 0; i < startDay; i++) out.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);

      const dateStr =
        dateObj.getFullYear() +
        "-" +
        String(dateObj.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(dateObj.getDate()).padStart(2, "0");
      const entries = grouped[dateStr] || [];
      if (entries.length > 0) {
        const avg = entries.reduce((s, e) => s + parseInt(e.score), 0) / entries.length;
        out.push({ avg, emoji: entries[entries.length - 1].emoji, date: dateStr, count: entries.length });
      } else {
        out.push({ avg: null, emoji: null, date: dateStr, count: 0 });
      }
    }
    return out;
  }, [grouped, year, month, startDay, totalDays]);

  const totalEntries = Object.values(grouped).flat().length;
  const daysLogged = Object.keys(grouped).filter(d => {
    const [y, m] = d.split("-").map(Number);
    return y === year && m === month + 1;
  }).length;

  return (
    <div className="mb-root">

      <div className="mb-header">
        <span className="mb-title">{MONTH_NAMES[month]} {year}</span>
        <div className="mb-stats">
          <span className="mb-stat"><strong>{totalEntries}</strong> entries</span>
          <span className="mb-dot">·</span>
          <span className="mb-stat"><strong>{daysLogged}</strong> days logged</span>
        </div>
      </div>

      <div className="mb-grid-wrap">
        <div className="mb-day-labels">
          {DAY_LABELS.map(d => (
            <span key={d} className="mb-day-label">{d}</span>
          ))}
        </div>

        <div className="mb-grid">
          {cells.map((cell, i) => {
            if (!cell) {
              return <div key={`e-${i}`} className="mb-cell mb-cell-empty" />;
            }
            return (
              <div
                key={cell.date}
                className="mb-cell"
                style={{ backgroundColor: scoreToColor(cell.avg) }}
                title={
                  cell.avg !== null
                    ? `${cell.date}  ·  avg ${cell.avg.toFixed(1)}/10  ·  ${cell.count} ${cell.count === 1 ? "entry" : "entries"}`
                    : `${cell.date}  ·  No entries`
                }
              >
                {cell.emoji && <span className="mb-emoji">{cell.emoji}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-legend">
        <span className="mb-legend-label">0</span>
        <div className="mb-legend-track">
          {Array.from({ length: 21 }, (_, i) => i * 0.5).map(s => (
            <div
              key={s}
              className="mb-legend-swatch"
              style={{ backgroundColor: scoreToColor(s) }}
            />
          ))}
        </div>
        <span className="mb-legend-label">10</span>
        <span className="mb-legend-note">avg mood / day</span>
      </div>

    </div>
  );
}

export default MoodBoard;