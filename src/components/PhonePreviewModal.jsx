import { useState } from 'react';
import { LeftSquareIcon, RightSquareIcon, CloseIcon, ImageIcon } from './icons.jsx';

const SHAPES = ['▲', '◆', '●', '■'];

// Mimics the player's phone screen for a question/slide — always in Hebrew, regardless of the
// quiz's display language (players' phones never show the translated text). The answer grid's
// left/right arrangement does mirror for an LTR display language, though, to match the mirrored
// layout shown on the presenter screen (see AnswerGrid in QuestionDisplay.jsx).
function PhoneQuestionView({ q, answerButtonStyle, coverImageURL, ltr }) {
  const shapeStyle = answerButtonStyle === 'shape';
  const img = q.imageURL || coverImageURL;

  return (
    <div className="card pop-in" style={{ width: '100%', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ width: 150, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }} />
      </div>

      <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 14 }}>{q.text || '(אין טקסט שאלה)'}</div>

      {img && <img src={img} alt="" style={{ width: '100%', borderRadius: 14, display: 'block', marginBottom: 16, maxHeight: 150, objectFit: 'cover' }} />}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', direction: ltr ? 'ltr' : 'rtl' }}>
        {q.options.map((opt, i) => {
          if (shapeStyle) {
            return (
              <div key={i} style={{ aspectRatio: '1', borderRadius: 16, background: `var(--opt-${i})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, color: 'white' }}>
                {SHAPES[i]}
              </div>
            );
          }
          const badgeOnRight = i % 2 === 0;
          const badge = (
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, color: 'white' }}>
              {i + 1}
            </div>
          );
          const text = <div style={{ flex: 1, minWidth: 0, textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'white' }}>{opt || `תשובה ${i + 1}`}</div>;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 14, background: `var(--opt-${i})`, minHeight: 58, padding: '10px 12px' }}>
              {badgeOnRight ? <>{badge}{text}</> : <>{text}{badge}</>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhoneSlideView({ item, coverImageURL }) {
  const src = item.imageURL || coverImageURL;
  return (
    <div className="card pop-in" style={{ width: '100%', padding: 16 }}>
      <div style={{ width: '100%', aspectRatio: '1240 / 800', borderRadius: 14, overflow: 'hidden', background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={40} />}
      </div>
      {item.imageSize === 'full' && <div className="dim" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>(מוצג במסך מלא בפלאפון)</div>}
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div style={{
      width: 300, flexShrink: 0, borderRadius: 36, border: '10px solid #15122a', background: '#0b0b12',
      boxShadow: '0 24px 60px rgba(0,0,0,0.55)', padding: '22px 12px', display: 'flex',
      flexDirection: 'column', alignItems: 'center', minHeight: 560,
    }}>
      {children}
    </div>
  );
}

function iconBtnStyle(disabled) {
  return {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: 'rgba(37,32,68,0.7)', border: '1px solid #3e376e',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
  };
}

export default function PhonePreviewModal({ questions, startIndex = 0, onClose, quizTitle, coverImageURL, answerButtonStyle, displayLanguage }) {
  const [index, setIndex] = useState(startIndex);
  const q = questions[index];
  const isSlide = q?.type === 'slide';
  const ltr = !!displayLanguage && displayLanguage !== 'he';

  function go(delta) {
    setIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
  }

  if (!q) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'var(--bg-1)', zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px', overflowY: 'auto',
        backgroundImage: 'radial-gradient(1200px 800px at 15% -10%, var(--bg-3), transparent), radial-gradient(1000px 700px at 110% 10%, #4c1d95aa, transparent)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ fontSize: 14 }}>
          <span className="dim">ניהול חידונים</span>
          <span className="dim"> / </span>
          <span className="dim">{quizTitle || 'חידון'}</span>
          <span className="dim"> / </span>
          <span style={{ color: '#b288ff', fontWeight: 700 }}>📱 תצוגה בנייד</span>
          <span className="dim"> · שאלה {index + 1} מתוך {questions.length}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => go(1)} disabled={index === questions.length - 1} title="שאלה הבאה" style={iconBtnStyle(index === questions.length - 1)}><RightSquareIcon size={24} /></button>
          <button type="button" onClick={() => go(-1)} disabled={index === 0} title="שאלה קודמת" style={iconBtnStyle(index === 0)}><LeftSquareIcon size={24} /></button>
          <button type="button" onClick={onClose} title="סגירה" style={iconBtnStyle(false)}><CloseIcon size={24} /></button>
        </div>
      </div>

      <div className="dim" style={{ fontSize: 13, marginBottom: 16 }}>כך תיראה השאלה בטלפון של השחקנים — תמיד בעברית, גם כשלחידון יש שפת תצוגה נוספת במסך המנחה</div>

      <PhoneFrame>
        {isSlide
          ? <PhoneSlideView item={q} coverImageURL={coverImageURL} />
          : <PhoneQuestionView q={q} answerButtonStyle={answerButtonStyle} coverImageURL={coverImageURL} ltr={ltr} />}
      </PhoneFrame>
    </div>
  );
}
