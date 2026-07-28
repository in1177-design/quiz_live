const SHAPES = ['▲', '◆', '●', '■'];

export default function BarChart({ counts, options, correctIndex, revealed }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {counts.map((count, i) => {
        const pct = (count / max) * 100;
        const isCorrect = revealed && i === correctIndex;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36, height: 36, borderRadius: 10, background: `var(--opt-${i})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'white',
                flexShrink: 0, opacity: revealed && !isCorrect ? 0.4 : 1,
                boxShadow: isCorrect ? '0 0 0 3px rgba(255,255,255,0.6)' : 'none',
              }}
            >
              {SHAPES[i]}
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden', height: 36, position: 'relative' }}>
              <div
                style={{
                  width: `${pct}%`, height: '100%', background: `var(--opt-${i})`,
                  opacity: revealed && !isCorrect ? 0.35 : 0.9,
                  display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingInlineEnd: 10,
                  transition: 'width 0.5s ease', minWidth: 40,
                }}
              >
                <span style={{ fontWeight: 700 }}>{count}</span>
              </div>
              {options?.[i] && (
                <span
                  style={{
                    position: 'absolute', insetInlineStart: 12, top: 0, height: '100%',
                    display: 'flex', alignItems: 'center', fontWeight: 600, fontSize: 15,
                    color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.5)', pointerEvents: 'none',
                  }}
                >
                  {options[i]}
                </span>
              )}
            </div>
            {isCorrect && <span style={{ fontSize: 20 }}>✅</span>}
          </div>
        );
      })}
    </div>
  );
}
