import { useState } from 'react';
import { QuestionCard } from './QuestionDisplay.jsx';
import EditingQuestionCard from './QuestionEditorCard.jsx';
import { EyeIcon, EditIcon, LeftSquareIcon, RightSquareIcon, CloseIcon } from './icons.jsx';

function iconBtnStyle(active, disabled) {
  return {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: active ? 'rgba(178,136,255,0.25)' : 'rgba(37,32,68,0.7)',
    border: `1px solid ${active ? 'var(--accent)' : '#3e376e'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
  };
}

export default function PreviewModal({ questions, startIndex = 0, onClose, quizId, quizTitle, onSaveQuestion }) {
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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg-1)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', overflowY: 'auto',
        backgroundImage: 'radial-gradient(1200px 800px at 15% -10%, var(--bg-3), transparent), radial-gradient(1000px 700px at 110% 10%, #4c1d95aa, transparent)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 1380, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ fontSize: 14 }}>
          <span className="dim">ניהול חידונים</span>
          <span className="dim"> / </span>
          <span className="dim">החידונים שלי</span>
          <span className="dim"> / </span>
          <span className="dim">{quizTitle || 'חידון'}</span>
          <span className="dim"> / </span>
          <span style={{ color: '#b288ff', fontWeight: 700 }}>תצוגה מקדימה</span>
          <span className="dim"> · שאלה {index + 1} מתוך {questions.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {!draft && (
            <>
              <button type="button" onClick={() => go(1)} disabled={index === questions.length - 1} title="שאלה הבאה" style={iconBtnStyle(false, index === questions.length - 1)}><RightSquareIcon size={24} /></button>
              <button type="button" onClick={() => go(-1)} disabled={index === 0} title="שאלה קודמת" style={iconBtnStyle(false, index === 0)}><LeftSquareIcon size={24} /></button>
              {onSaveQuestion && <button type="button" onClick={startEdit} title="עריכת שאלה" style={iconBtnStyle(false)}><EditIcon size={24} /></button>}
              <button type="button" onClick={() => setRevealed((r) => !r)} title={revealed ? 'הצג מסך שאלה' : 'הצג מסך תשובה'} style={iconBtnStyle(revealed)}><EyeIcon size={24} /></button>
            </>
          )}
          <button type="button" onClick={onClose} title="סגירה" style={iconBtnStyle(false)}><CloseIcon size={24} /></button>
        </div>
      </div>

      {draft ? (
        <div style={{ flex: 1, width: '100%', maxWidth: 1380 }}>
          <EditingQuestionCard q={draft} quizId={quizId} onChange={setDraft} onSave={finishEdit} onCancel={() => setDraft(null)} />
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <QuestionCard q={q} revealed={revealed} secondsLeft={q.timeLimit} voters={[]} showWho={false} />
        </div>
      )}
    </div>
  );
}
