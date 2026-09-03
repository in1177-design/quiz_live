import { useState } from 'react';
import { QuestionCard, FullBackgroundQuestionCard } from './QuestionDisplay.jsx';
import EditingQuestionCard from './QuestionEditorCard.jsx';
import { EyeIcon, EditIcon, LeftSquareIcon, RightSquareIcon, CloseIcon, ImageIcon } from './icons.jsx';

function SlidePreview({ item, coverImageURL }) {
  const src = item.imageURL || coverImageURL;
  const image = src ? (
    <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={64} /></div>
  );
  return (
    <div className="card pop-in" style={{ width: '100%', padding: 40, display: 'flex', justifyContent: 'center' }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 1240, aspectRatio: '1240 / 800', borderRadius: 20,
        border: '1.5px solid #342e5b', overflow: 'hidden', background: 'var(--surface-strong)',
      }}>
        {image}
      </div>
    </div>
  );
}

function iconBtnStyle(active, disabled) {
  return {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: active ? 'rgba(178,136,255,0.25)' : 'rgba(37,32,68,0.7)',
    border: `1px solid ${active ? 'var(--accent)' : '#3e376e'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
  };
}

export default function PreviewModal({ questions, startIndex = 0, onClose, quizId, quizTitle, onSaveQuestion, coverImageURL, questionLayout, manualTimer, displayLanguage }) {
  const [index, setIndex] = useState(startIndex);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState(null);
  const q = questions[index];
  const isSlide = q?.type === 'slide';
  const hasImage = !!(q?.imageURL || q?.answerImageURL || coverImageURL);
  const fullBackground = !isSlide && questionLayout === 'full' && hasImage;
  const translationLang = displayLanguage && displayLanguage !== 'he' ? displayLanguage : null;
  const ltr = !!translationLang;
  const displayQ = q && ltr && !isSlide
    ? {
        ...q,
        text: q.textTranslated || q.text,
        options: q.options.map((o, i) => q.optionsTranslated?.[i] || o),
        answerExplanation: q.answerExplanationTranslated || q.answerExplanation,
        // Kept alongside the translated explanation so the reveal can show both side by side.
        answerExplanationHe: q.answerExplanationTranslated ? q.answerExplanation : null,
      }
    : q;

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
      <div style={{ width: '100%', maxWidth: 1380, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, position: 'relative', zIndex: 10 }}>
        <div style={{ fontSize: 14, ...(fullBackground ? { background: 'rgba(15,12,32,0.75)', padding: '8px 14px', borderRadius: 10 } : {}) }}>
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
              {onSaveQuestion && !isSlide && <button type="button" onClick={startEdit} title="עריכת שאלה" style={iconBtnStyle(false)}><EditIcon size={24} /></button>}
              {!isSlide && <button type="button" onClick={() => setRevealed((r) => !r)} title={revealed ? 'הצג מסך שאלה' : 'הצג מסך תשובה'} style={iconBtnStyle(revealed)}><EyeIcon size={24} /></button>}
            </>
          )}
          <button type="button" onClick={onClose} title="סגירה" style={iconBtnStyle(false)}><CloseIcon size={24} /></button>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {isSlide && <SlidePreview item={q} coverImageURL={coverImageURL} />}
        {!isSlide && fullBackground && <FullBackgroundQuestionCard key={index} q={displayQ} revealed={revealed} secondsLeft={q.timeLimit} voters={[]} coverImageURL={coverImageURL} manualTimer={manualTimer} ltr={ltr} />}
        {!isSlide && !fullBackground && <QuestionCard key={index} q={displayQ} revealed={revealed} secondsLeft={q.timeLimit} voters={[]} coverImageURL={coverImageURL} manualTimer={manualTimer} ltr={ltr} />}
      </div>

      {draft && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto',
          }}
        >
          <div style={{ width: '100%', maxWidth: 1000 }}>
            <EditingQuestionCard q={draft} quizId={quizId} onChange={setDraft} onSave={finishEdit} onCancel={() => setDraft(null)} translationLang={translationLang} />
          </div>
        </div>
      )}
    </div>
  );
}
