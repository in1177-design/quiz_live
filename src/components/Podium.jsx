const STEP_STYLES = [
  { order: 2, height: 250, color: 'var(--gold)', ring: '#facc15', crown: true, avatarSize: 128 },
  { order: 1, height: 185, color: 'var(--silver)', ring: '#cbd5e1', crown: false, avatarSize: 104 },
  { order: 3, height: 145, color: 'var(--bronze)', ring: '#d97757', crown: false, avatarSize: 104 },
];

export default function Podium({ top3 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 24, width: '100%', maxWidth: 920 }}>
      {STEP_STYLES.map((step, idx) => {
        const player = top3[idx];
        if (!player) return <div key={idx} style={{ flex: 1 }} />;
        return (
          <div
            key={idx}
            className="pop-in"
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', order: step.order, animationDelay: `${idx * 0.15}s` }}
          >
            <div style={{ position: 'relative', marginBottom: 14, zIndex: 2 }}>
              {step.crown && (
                <div style={{ position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)', fontSize: 44 }}>👑</div>
              )}
              <div style={{
                width: step.avatarSize, height: step.avatarSize, borderRadius: '50%',
                border: `5px solid ${step.ring}`, boxShadow: `0 10px 28px ${step.ring}77, 0 0 0 5px var(--bg-1)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: step.avatarSize * 0.48, background: 'var(--surface-strong)', overflow: 'hidden',
              }}>
                {player.avatar?.type === 'photo'
                  ? <img src={player.avatar.value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : player.avatar?.value}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 22, textAlign: 'center', marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{player.name}</div>
            <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: '6px 18px', fontWeight: 700, fontSize: 17, marginBottom: 16 }}>{player.score} נק'</div>
            <div
              style={{
                width: '100%', height: step.height, borderRadius: '22px 22px 0 0',
                background: `linear-gradient(180deg, ${step.color}, ${step.color}bb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: 'inset 0 4px 0 rgba(255,255,255,0.4)',
              }}
            >
              <div style={{ fontSize: 96, fontWeight: 900, color: 'rgba(0,0,0,0.4)', lineHeight: 1 }}>{idx + 1}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
