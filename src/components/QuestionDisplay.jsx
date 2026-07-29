import { AvatarStack } from './BarChart.jsx';

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

export function AnswerGrid({ options, correctIndex, revealed, voters, showWho }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, width: '100%' }}>
      {options.map((opt, i) => {
        const isCorrect = i === correctIndex;
        const muted = revealed && !isCorrect;
        const badge = (
          <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(255,255,255,0.31)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'white', flexShrink: 0 }}>
            {i + 1}
          </div>
        );
        const text = <div style={{ flex: 1, minWidth: 0, textAlign: 'right', fontWeight: 700, fontSize: 16, color: 'white' }}>{opt}</div>;
        const avatars = showWho && voters?.[i]?.length ? <AvatarStack voters={voters[i]} /> : null;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 12, height: 58, padding: '0 16px', borderRadius: 14,
            background: muted ? '#3e376e' : `var(--opt-${i})`, transition: 'background 0.4s ease',
          }}>
            {avatars}{badge}{text}
          </div>
        );
      })}
    </div>
  );
}

export function QuestionCard({ q, revealed, secondsLeft, voters, showWho, meta }) {
  const displayImage = revealed ? (q.answerImageURL || q.imageURL) : q.imageURL;
  return (
    <div className="card pop-in" style={{ width: '100%', padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: revealed ? 20 : 24 }}>
      {!revealed && <PillTimer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} />}
      <div className="title" style={{ fontSize: 24, textAlign: 'center' }}>{q.text || '(אין טקסט שאלה)'}</div>
      {revealed && q.answerExplanation && (
        <div style={{ fontSize: 22, fontWeight: 700, color: '#f59e0b', textAlign: 'center' }}>{q.answerExplanation}</div>
      )}
      {displayImage && (
        <div style={{ width: 1240, maxWidth: '100%', borderRadius: 20, border: revealed ? 'none' : '1.5px solid #342e5b', overflow: 'hidden' }}>
          <img src={displayImage} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
      )}
      {meta}
      <AnswerGrid options={q.options} correctIndex={q.correctIndex} revealed={revealed} voters={voters} showWho={showWho} />
    </div>
  );
}
