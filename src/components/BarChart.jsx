const SHAPES = ['▲', '◆', '●', '■'];

function AvatarStack({ voters }) {
  if (!voters?.length) return null;
  const shown = voters.slice(0, 6);
  return (
    <div style={{ display: 'flex', flexShrink: 0 }}>
      {shown.map((p, idx) => (
        <div
          key={idx}
          title={p?.name}
          style={{
            width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--bg-1)',
            marginInlineStart: idx === 0 ? 0 : -14, overflow: 'hidden', display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: 'var(--surface-strong)', fontSize: 16, flexShrink: 0,
            zIndex: shown.length - idx,
          }}
        >
          {p?.avatar?.type === 'photo'
            ? <img src={p.avatar.value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : p?.avatar?.value}
        </div>
      ))}
      {voters.length > 6 && (
        <div style={{
          width: 34, height: 34, borderRadius: '50%', border: '2px solid var(--bg-1)', marginInlineStart: -14,
          background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>
          +{voters.length - 6}
        </div>
      )}
    </div>
  );
}

export default function BarChart({ counts, options, correctIndex, revealed, voters }) {
  const max = Math.max(1, ...counts);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {counts.map((count, i) => {
        const pct = (count / max) * 100;
        const isCorrect = revealed && i === correctIndex;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: revealed && !isCorrect ? 0.5 : 1 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: `var(--opt-${i})`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              boxShadow: isCorrect ? '0 0 0 3px rgba(255,255,255,0.7)' : 'none',
            }}>
              {SHAPES[i]}
            </div>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: `var(--opt-${i})`, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ background: `var(--opt-${i})`, borderRadius: 10, padding: '10px 16px', fontWeight: 600, fontSize: 16 }}>
                {options?.[i]}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden', height: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `var(--opt-${i})`, transition: 'width 0.5s ease' }} />
              </div>
            </div>
            <AvatarStack voters={voters?.[i]} />
          </div>
        );
      })}
    </div>
  );
}
