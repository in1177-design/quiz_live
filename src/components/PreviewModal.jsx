import { useState } from 'react';
import Timer from './Timer.jsx';
import BarChart from './BarChart.jsx';
import AnswerTiles from './AnswerTiles.jsx';
import QuestionForm from './QuestionForm.jsx';

export default function PreviewModal({ questions, startIndex = 0, onClose, quizId, onSaveQuestion }) {
  const [index, setIndex] = useState(startIndex);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(null);
  const q = questions[index];

  function go(delta) {
    setRevealed(false);
    setDraft(null);
    setIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
  }

  if (!q) return null;

  function startEdit() {
    setDraft({ ...q, id: q.id || `${quizId || 'q'}-${index}`, uploading: false, uploadingAnswer: false });
  }

  function finishEdit() {
    onSaveQuestion?.(index, draft);
    setDraft(null);
  }

  const displayImage = revealed ? (q.answerImageURL || q.imageURL) : q.imageURL;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg-1)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px',
        backgroundImage: 'radial-gradient(1200px 800px at 15% -10%, var(--bg-3), transparent), radial-gradient(1000px 700px at 110% 10%, #4c1d95aa, transparent)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1400, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="dim">תצוגה מקדימה — שאלה {index + 1} מתוך {questions.length} · {draft ? '✏️ עריכה' : revealed ? '🖥️ מסך תשובה (גרף)' : '🖥️ מסך שאלה'}</span>
        <button className="btn btn-secondary" style={{ padding: '6px 14px' }} onClick={onClose}>✕ סגירה</button>
      </div>

      {draft ? (
        <div style={{ flex: 1, width: '100%', maxWidth: 640, overflowY: 'auto' }}>
          <QuestionForm q={draft} quizId={quizId} onChange={setDraft} onDone={finishEdit} doneLabel="✓ שמירה" onCancel={() => setDraft(null)} />
        </div>
      ) : (
        <>
          <div style={{ flex: 1, width: '100%', maxWidth: 1400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, overflowY: 'auto' }}>
            {!revealed && <Timer secondsLeft={q.timeLimit} totalSeconds={q.timeLimit} size={100} />}

            {revealed ? (
              <div style={{ fontSize: 20, fontWeight: 400, textAlign: 'center', color: 'var(--text-dim)' }}>{q.text || '(אין טקסט שאלה)'}</div>
            ) : (
              <div className="title" style={{ fontSize: 38, textAlign: 'center' }}>{q.text || '(אין טקסט שאלה)'}</div>
            )}
            {displayImage && <img src={displayImage} alt="" style={{ maxWidth: '100%', maxHeight: '48vh', borderRadius: 20 }} />}
            {revealed && q.answerExplanation && (
              <div style={{ fontSize: 26, fontWeight: 800, textAlign: 'center', maxWidth: 640 }}>{q.answerExplanation}</div>
            )}

            <div style={{ width: '100%', maxWidth: 1400 }}>
              {revealed ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 500, color: `var(--opt-${q.correctIndex})`, marginBottom: 16, textAlign: 'center' }}>
                    ✅ {q.options[q.correctIndex]}
                  </div>
                  <BarChart counts={[0, 0, 0, 0]} options={q.options} correctIndex={q.correctIndex} revealed={true} />
                </>
              ) : (
                <AnswerTiles options={q.options} />
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" disabled={index === 0} onClick={() => go(-1)}>→ שאלה קודמת</button>
            {onSaveQuestion && <button className="btn btn-secondary" onClick={startEdit}>✏️ עריכה</button>}
            <button className="btn" onClick={() => setRevealed((r) => !r)}>
              {revealed ? '🔙 הצג מסך שאלה' : '✅ הצג מסך תשובה (גרף)'}
            </button>
            <button className="btn btn-secondary" disabled={index === questions.length - 1} onClick={() => go(1)}>שאלה הבאה ←</button>
          </div>
        </>
      )}
    </div>
  );
}
