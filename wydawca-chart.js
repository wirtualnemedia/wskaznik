// wydawca-chart.js
// Wykres historii wyniku WWW + pozycji w rankingu (8 miesięcy)

(function() {
  const { useState, useRef } = React;

  function HistoryChart({ history, months }) {
    const [hover, setHover] = useState(null);
    const ref = useRef(null);

    // Map every month slot — fill gaps with null so x-axis is consistent
    const slots = months.map(m => ({
      month: m,
      entry: (history.find(h => h.month.id === m.id) || {}).entry || null
    }));

    const W = 800, H = 220;
    const padL = 50, padR = 40, padT = 24, padB = 36;
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const xs = slots.map((_, i) => padL + (slots.length > 1 ? (i / (slots.length - 1)) * innerW : innerW / 2));

    // Score axis (left)
    const scores = slots.map(s => s.entry?.score).filter(v => v != null);
    const sMax = scores.length ? Math.ceil(Math.max(...scores) / 5) * 5 + 5 : 50;
    const sMin = 0;
    const yScore = v => padT + innerH - ((v - sMin) / (sMax - sMin)) * innerH;

    // Rank axis (right) — inverted (lower rank = higher on chart)
    const ranks = slots.map(s => s.entry?.rank).filter(v => v != null);
    let rMin = ranks.length ? Math.min(...ranks) : 1;
    let rMax = ranks.length ? Math.max(...ranks) : 100;
    // Add some padding to rank range
    const rRange = rMax - rMin;
    if (rRange < 5) { rMax = rMin + 5; }
    rMin = Math.max(1, rMin - Math.ceil(rRange * 0.15));
    rMax = rMax + Math.ceil(rRange * 0.15);
    const yRank = v => padT + ((v - rMin) / (rMax - rMin)) * innerH;

    // Build path
    const scoreSegments = [];
    let curSeg = [];
    slots.forEach((s, i) => {
      if (s.entry) {
        curSeg.push({ x: xs[i], y: yScore(s.entry.score), entry: s.entry, month: s.month });
      } else {
        if (curSeg.length) scoreSegments.push(curSeg);
        curSeg = [];
      }
    });
    if (curSeg.length) scoreSegments.push(curSeg);

    const rankSegments = [];
    curSeg = [];
    slots.forEach((s, i) => {
      if (s.entry) {
        curSeg.push({ x: xs[i], y: yRank(s.entry.rank), entry: s.entry, month: s.month });
      } else {
        if (curSeg.length) rankSegments.push(curSeg);
        curSeg = [];
      }
    });
    if (curSeg.length) rankSegments.push(curSeg);

    const pathOf = pts => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    // Y-axis ticks
    const sTicks = [];
    const step = Math.ceil((sMax - sMin) / 4 / 5) * 5 || 10;
    for (let v = sMin; v <= sMax; v += step) sTicks.push(v);

    // Hover state
    const handleMove = (e) => {
      const rect = ref.current.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * W;
      // find nearest x with data
      let nearestIdx = -1, nearestDist = Infinity;
      slots.forEach((s, i) => {
        if (s.entry) {
          const d = Math.abs(xs[i] - px);
          if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
        }
      });
      if (nearestIdx >= 0 && nearestDist < 60) {
        const s = slots[nearestIdx];
        setHover({ 
          x: xs[nearestIdx], 
          entry: s.entry, 
          month: s.month,
          clientX: e.clientX,
          clientY: e.clientY
        });
      } else {
        setHover(null);
      }
    };

    return (
      <div style={{position:'relative'}}>
        <svg ref={ref} className="chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
             onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
          
          {/* Grid lines + score axis */}
          {sTicks.map(t => (
            <g key={'st-'+t}>
              <line x1={padL} x2={W-padR} y1={yScore(t)} y2={yScore(t)} stroke="#E0E0E0" strokeDasharray="2,3"/>
              <text x={padL - 8} y={yScore(t)} fontSize="10" fill="#8A9AAB" textAnchor="end" dominantBaseline="middle" fontWeight="600">{t}</text>
            </g>
          ))}
          {/* Score axis label */}
          <text x={padL - 38} y={padT - 8} fontSize="10" fill="#F05A28" fontWeight="700" letterSpacing="0.06em">WWW</text>

          {/* Rank axis (right) */}
          {[rMin, Math.round((rMin+rMax)/2), rMax].map(r => (
            <text key={'rt-'+r} x={W-padR+8} y={yRank(r)} fontSize="10" fill="#8A9AAB" textAnchor="start" dominantBaseline="middle" fontWeight="600">#{r}</text>
          ))}
          <text x={W - padR + 8} y={padT - 8} fontSize="10" fill="#0D1B2A" fontWeight="700" letterSpacing="0.06em">Poz.</text>

          {/* Month labels */}
          {slots.map((s, i) => (
            <text key={'ml-'+s.month.id} x={xs[i]} y={H - 12} fontSize="10" fill="#555" textAnchor="middle" fontWeight="600">
              {s.month.short} {String(s.month.year).slice(2)}
            </text>
          ))}

          {/* Rank line (dashed, behind) */}
          {rankSegments.map((seg, i) => (
            <path key={'rk-'+i} d={pathOf(seg)} stroke="#0D1B2A" strokeWidth="1.5" fill="none" strokeDasharray="4,4" opacity="0.5"/>
          ))}
          {rankSegments.flat().map((p, i) => (
            <circle key={'rkc-'+i} cx={p.x} cy={p.y} r="2.5" fill="#0D1B2A" opacity="0.6"/>
          ))}

          {/* Score line (orange, primary) */}
          {scoreSegments.map((seg, i) => (
            <path key={'sc-'+i} d={pathOf(seg)} stroke="#F05A28" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
          ))}
          {scoreSegments.flat().map((p, i) => (
            <circle key={'scc-'+i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#F05A28" strokeWidth="2"/>
          ))}

          {/* Hover indicator */}
          {hover && (
            <>
              <line x1={hover.x} x2={hover.x} y1={padT} y2={H - padB} stroke="#0D1B2A" strokeWidth="1" strokeDasharray="2,2" opacity="0.4"/>
              <circle cx={hover.x} cy={yScore(hover.entry.score)} r="6" fill="#F05A28"/>
              <circle cx={hover.x} cy={yRank(hover.entry.rank)} r="5" fill="#0D1B2A"/>
            </>
          )}
        </svg>

        {hover && (
          <div className="chart-tooltip" style={{
            left: hover.clientX + 12,
            top: hover.clientY - 60,
          }}>
            <div className="chart-tooltip-title">{hover.month.name} {hover.month.year}</div>
            <div>Wynik: <strong style={{color:'#F05A28'}}>{hover.entry.score.toFixed(2)} pkt</strong></div>
            <div>Pozycja: <strong>#{hover.entry.rank}</strong>
              {hover.entry.change !== 0 && (
                <span style={{marginLeft:6, color: hover.entry.change > 0 ? '#34d399' : '#fca5a5'}}>
                  ({hover.entry.change > 0 ? '+' : ''}{hover.entry.change})
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  window.HistoryChart = HistoryChart;
})();
