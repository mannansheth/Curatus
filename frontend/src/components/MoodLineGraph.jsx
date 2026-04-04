import './MoodLineGraph.css';
import {useState, useRef, useEffect} from 'react';


function MoodLineGraph({ data }) {
  const [tooltip, setTooltip] = useState(null); 
  const [animated, setAnimated] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 60);
    return () => clearTimeout(t);
  }, []);

  if (!data || data.length === 0) {
    return (
      <div className="graph-empty">
        No entries yet — start logging your mood to see your trend.
      </div>
    );
  }

  const W = 600;
  const H = 240;
  const PAD = { top: 24, right: 24, bottom: 40, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const minScore = 0;
  const maxScore = 10;

  const xScale = (i) => PAD.left + (i / (data.length - 1 || 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - minScore) / (maxScore - minScore)) * innerH;

  const points = data.map((d, i) => `${xScale(i)},${yScale(d.score)}`).join(' ');

  // Area path (filled gradient region under the line)
  const firstX = xScale(0);
  const lastX  = xScale(data.length - 1);
  const baseY  = PAD.top + innerH;
  const areaPath =
    `M${firstX},${baseY} ` +
    data.map((d, i) => `L${xScale(i)},${yScale(d.score)}`).join(' ') +
    ` L${lastX},${baseY} Z`;

  // Y-axis gridlines at 0, 2, 4, 6, 8, 10
  const gridLines = [0, 2, 4, 6, 8, 10];

  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find closest data point
    let closest = 0;
    let closestDist = Infinity;
    data.forEach((_, i) => {
      const dist = Math.abs(xScale(i) - mouseX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    });

    setTooltip({
      x: xScale(closest),
      y: yScale(data[closest].score),
      entry: data[closest],
      index: closest,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // Total polyline length approximation for stroke-dasharray animation
  const totalLen = data.length > 1
    ? data.slice(1).reduce((sum, d, i) => {
        const x1 = xScale(i); const y1 = yScale(data[i].score);
        const x2 = xScale(i + 1); const y2 = yScale(d.score);
        return sum + Math.hypot(x2 - x1, y2 - y1);
      }, 0)
    : 0;

  return (
    <div className="line-graph-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="line-graph-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        aria-label="Mood score over time"
      >
        <defs>
          {/* Gradient fill under the line */}
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.02" />
          </linearGradient>

          {/* Glow filter on the line */}
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Clip the animation */}
          <clipPath id="lineClip">
            <rect
              x={PAD.left}
              y={0}
              width={animated ? innerW : 0}
              height={H}
              style={{ transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}
            />
          </clipPath>
        </defs>

        {/* ── Grid lines + Y labels ── */}
        {gridLines.map(val => {
          const y = yScale(val);
          return (
            <g key={val}>
              <line
                x1={PAD.left} y1={y}
                x2={PAD.left + innerW} y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8} y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#4b5563"
              >
                {val}
              </text>
            </g>
          );
        })}


        {data.map((d, i) => {
          // Show every label if ≤7 points, else every other
          if (data.length > 7 && i % 2 !== 0 && i !== data.length - 1) return null;
          const label = d.date
            ? new Date(d.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            : `#${i + 1}`;
          return (
            <text
              key={i}
              x={xScale(i)}
              y={H - 8}
              textAnchor="middle"
              fontSize="10"
              fill="#4b5563"
            >
              {label}
            </text>
          );
        })}


        <clipPath id="areaClip">
          <rect
            x={PAD.left} y={0}
            width={animated ? innerW : 0}
            height={H}
            style={{ transition: 'width 1s cubic-bezier(.4,0,.2,1)' }}
          />
        </clipPath>
        <path
          d={areaPath}
          fill="url(#areaGrad)"
          clipPath="url(#areaClip)"
        />


        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#lineGlow)"
          clipPath="url(#lineClip)"
        />


        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.score)}
            r={tooltip?.index === i ? 6 : 4}
            fill={tooltip?.index === i ? '#818cf8' : '#4f46e5'}
            stroke="#0d1117"
            strokeWidth="2"
            style={{ transition: 'r 0.15s ease, fill 0.15s ease', opacity: animated ? 1 : 0, transitionDelay: `${0.8 + i * 0.04}s` }}
          />
        ))}


        {tooltip && (() => {
          const tx = tooltip.x;
          const ty = tooltip.y;
          const boxW = 110;
          const boxH = 52;
          // keep box inside SVG
          const bx = Math.min(Math.max(tx - boxW / 2, PAD.left), W - PAD.right - boxW);
          const by = ty - boxH - 14 < PAD.top ? ty + 14 : ty - boxH - 14;

          const label = tooltip.entry.date
            ? new Date(tooltip.entry.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
            : `Entry ${tooltip.index + 1}`;

          return (
            <g>

              <line
                x1={tx} y1={PAD.top}
                x2={tx} y2={PAD.top + innerH}
                stroke="rgba(99,102,241,0.3)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
  
              <rect
                x={bx} y={by}
                width={boxW} height={boxH}
                rx="8"
                fill="#1e2433"
                stroke="rgba(99,102,241,0.4)"
                strokeWidth="1"
              />

              <text x={bx + 10} y={by + 22} fontSize="14">{tooltip.entry.emoji}</text>

              <text x={bx + 32} y={by + 22} fontSize="13" fontWeight="700" fill="#f1f5f9">
                {tooltip.entry.score}/10
              </text>

              <text x={bx + 10} y={by + 40} fontSize="10" fill="#6b7280">{label}</text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

export default MoodLineGraph