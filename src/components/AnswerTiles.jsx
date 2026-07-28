const SHAPES = ['▲', '◆', '●', '■'];

export default function AnswerTiles({ options }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
      {options.map((opt, i) => (
        <div
          key={i}
          style={{
            background: `var(--opt-${i})`, borderRadius: 14, padding: '18px 16px', minHeight: 64,
            display: 'flex', alignItems: 'center', gap: 10, color: 'white', fontWeight: 700, fontSize: 17,
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          }}
        >
          <span style={{ fontSize: 22, flexShrink: 0 }}>{SHAPES[i]}</span>
          <span style={{ textAlign: 'start' }}>{opt || `תשובה ${i + 1}`}</span>
        </div>
      ))}
    </div>
  );
}
