const STEP_STYLES = [
  { order: 2, height: 150, color: 'var(--gold)', medal: '🥇' },
  { order: 1, height: 110, color: 'var(--silver)', medal: '🥈' },
  { order: 3, height: 80, color: 'var(--bronze)', medal: '🥉' },
];

export default function Podium({ top3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 16, width: '100%', maxWidth: 640 }}>
      {STEP_STYLES.map((step, idx) => {
        const player = top3[idx];
        if (!player) return <div key={idx} style={{ flex: 1 }} />;
        return (
          <div
            key={idx}
            className="pop-in"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', order: step.order, animationDelay: `${idx * 0.15}s` }}
          >
            <div style={{ fontSize: 36, marginBottom: 6 }}>{step.medal}</div>
            <div style={{ fontSize: 40, marginBottom: 6 }}>
              {player.avatar?.type === 'photo'
                ? <img src={player.avatar.value} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }} />
                : player.avatar?.value}
            </div>
            <div style={{ fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>{player.name}</div>
            <div className="dim" style={{ marginBottom: 10 }}>{player.score} נק'</div>
            <div
              style={{
                width: '100%', height: step.height, borderRadius: '14px 14px 0 0',
                background: `linear-gradient(180deg, ${step.color}, ${step.color}55)`,
                display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10,
                fontSize: 28, fontWeight: 900, color: 'rgba(0,0,0,0.55)',
              }}
            >
              {idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
