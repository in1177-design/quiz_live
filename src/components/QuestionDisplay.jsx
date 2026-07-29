import { AvatarStack } from './BarChart.jsx';
import { ImageIcon } from './icons.jsx';

export function PillTimer({ secondsLeft, totalSeconds }) {
  const pct = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const urgent = secondsLeft <= 5;
  return (
    <div style={{ position: 'relative', width: 200, height: 40, borderRadius: 20, background: '#0b0b12', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 7, borderRadius: 999, background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${pct * 100}%`, borderRadius: 999,
          background: urgent ? 'var(--opt-0)' : 'linear-gradient(90deg, var(--accent), #22d3ee)',
          transition: 'width 1s linear',
        }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 18 }}>
        {Math.ceil(secondsLeft)}
      </div>
    </div>
  );
}

export function AnswerGrid({ options, correctIndex, revealed, voters }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
      {options.map((opt, i) => {
        const isCorrect = i === correctIndex;
        const muted = revealed && !isCorrect;
        const count = voters?.[i]?.length || 0;
        const badge = (
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.31)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0 }}>
            {i + 1}
          </div>
        );
        const text = <div style={{ flex: 1, minWidth: 0, textAlign: 'right', fontWeight: 700, fontSize: 24, color: 'white' }}>{opt}</div>;
        const voteCount = <div style={{ fontWeight: 800, fontSize: 20, color: 'white', flexShrink: 0, minWidth: 20, textAlign: 'center' }}>{count}</div>;
        return (
          <div key={i} style={{ position: 'relative' }}>
            {revealed && count > 0 && (
              <div style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', zIndex: 5 }}>
                <AvatarStack voters={voters[i]} />
              </div>
            )}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, minHeight: 58, padding: '12px 16px', borderRadius: 14,
              background: muted ? '#3e376e' : `var(--opt-${i})`, transition: 'background 0.4s ease',
            }}>
              {badge}{text}{voteCount}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const FADE = 'opacity 0.6s ease';

export function QuestionCard({ q, revealed, secondsLeft, voters, headerLabel }) {
  const qImg = q.imageURL;
  const aImg = q.answerImageURL || q.imageURL;
  const hasAnyImage = !!(qImg || aImg);

  return (
    <div className="card pop-in" style={{ width: '100%', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      {headerLabel && <div className="dim" style={{ width: '100%', textAlign: 'right', fontSize: 13, marginTop: -16 }}>{headerLabel}</div>}

      <div style={{ width: '100%', display: 'grid' }}>
        <div aria-hidden={revealed} style={{ gridArea: '1 / 1', display: 'flex', justifyContent: 'center', opacity: revealed ? 0 : 1, pointerEvents: revealed ? 'none' : 'auto', transition: FADE }}>
          <PillTimer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} />
        </div>
        <div aria-hidden={!revealed} style={{ gridArea: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none', transition: FADE }}>
          {q.answerExplanation && <div style={{ fontSize: 30, fontWeight: 700, color: '#f59e0b' }}>{q.answerExplanation}</div>}
        </div>
      </div>

      <div className="title" style={{ fontSize: 24, textAlign: 'center', opacity: revealed ? 0.5 : 1, transition: FADE }}>{q.text || '(אין טקסט שאלה)'}</div>

      <div style={{
        position: 'relative', width: '100%', maxWidth: 1240, aspectRatio: '1240 / 800', borderRadius: 20,
        border: '1.5px solid #342e5b', overflow: 'hidden', background: 'var(--surface-strong)',
      }}>
        {!hasAnyImage && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ImageIcon size={64} />
          </div>
        )}
        {qImg && (
          <img src={qImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 0 : 1, transition: FADE }} />
        )}
        {aImg && (
          <img src={aImg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: revealed ? 1 : 0, transition: FADE }} />
        )}
      </div>

      <AnswerGrid options={q.options} correctIndex={q.correctIndex} revealed={revealed} voters={voters} />
    </div>
  );
}
