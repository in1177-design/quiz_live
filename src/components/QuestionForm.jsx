import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.js';
import { compressImage } from '../utils/compressImage.js';
import ImageUploadField from './ImageUploadField.jsx';
import { CheckIcon } from './icons.jsx';
import { DISPLAY_LANGUAGES } from '../utils/languages.js';

const lightBoxStyle = {
  background: '#e1ddff',
  color: '#252044',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '14px 16px',
  fontSize: 16,
  fontWeight: 600,
  textAlign: 'right',
  outline: 'none',
};

const translatedBoxStyle = {
  ...lightBoxStyle,
  background: '#d8f0ea',
  textAlign: 'left',
  direction: 'ltr',
};

export default function QuestionForm({ q, quizId, onChange, onDone, doneLabel, onCancel, hideQuestionImage, bare, section, translationLang }) {
  const lang = translationLang ? DISPLAY_LANGUAGES[translationLang] : null;
  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...q, uploading: true });
    try {
      const blob = await compressImage(file, { maxDim: 1400, quality: 0.85 });
      const path = `questions/${quizId}/${q.id}.jpg`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      onChange({ ...q, imageURL: url, uploading: false });
    } catch (err) {
      console.error(err);
      alert('העלאת התמונה נכשלה');
      onChange({ ...q, uploading: false });
    }
  }

  async function handleAnswerImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...q, uploadingAnswer: true });
    try {
      const blob = await compressImage(file, { maxDim: 1400, quality: 0.85 });
      const path = `questions/${quizId}/${q.id}-answer.jpg`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      onChange({ ...q, answerImageURL: url, uploadingAnswer: false });
    } catch (err) {
      console.error(err);
      alert('העלאת התמונה נכשלה');
      onChange({ ...q, uploadingAnswer: false });
    }
  }

  const valid = !q.uploading && !q.uploadingAnswer;

  const topContent = (
    <>
      <input
        style={{ ...lightBoxStyle, width: '100%', marginBottom: lang ? 10 : 16 }}
        placeholder="טקסט השאלה"
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
      />
      {lang && (
        <input
          style={{ ...translatedBoxStyle, width: '100%', marginBottom: 16 }}
          placeholder={lang.questionPlaceholder}
          value={q.textTranslated || ''}
          onChange={(e) => onChange({ ...q, textTranslated: e.target.value })}
        />
      )}

      <div style={{ background: 'rgba(37,32,68,0.7)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 16, marginBottom: hideQuestionImage ? 0 : 16, flexWrap: 'wrap' }}>
        <div style={{ width: 150, flexShrink: 0 }}>
          <ImageUploadField id={`img-answer-${q.id}`} imageURL={q.answerImageURL} uploading={q.uploadingAnswer} onUpload={handleAnswerImage} />
        </div>

        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#252044', border: '1px solid rgba(62,55,110,0.93)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0, color: `var(--opt-${q.correctIndex})`, fontWeight: 700, fontSize: 15, textAlign: 'right' }}>
              {q.options[q.correctIndex]?.trim() || `תשובה ${q.correctIndex + 1}`}
            </div>
            <div style={{ flexShrink: 0, color: '#22c55e', display: 'flex' }}><CheckIcon size={20} /></div>
          </div>
          <textarea
            style={{ ...lightBoxStyle, width: '100%', minHeight: 70, resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }}
            placeholder="הסבר לתשובה (אופציונלי) — יופיע במסך חשיפת התשובה"
            value={q.answerExplanation}
            onChange={(e) => onChange({ ...q, answerExplanation: e.target.value })}
          />
          {lang && (
            <textarea
              style={{ ...translatedBoxStyle, width: '100%', minHeight: 70, resize: 'vertical', fontFamily: 'inherit', fontSize: 14 }}
              placeholder={lang.explanationPlaceholder}
              value={q.answerExplanationTranslated || ''}
              onChange={(e) => onChange({ ...q, answerExplanationTranslated: e.target.value })}
            />
          )}
        </div>
      </div>

      {!hideQuestionImage && (
        <div style={{ width: 150, marginTop: 16 }}>
          <ImageUploadField id={`img-${q.id}`} imageURL={q.imageURL} uploading={q.uploading} onUpload={handleImage} />
        </div>
      )}
    </>
  );

  const bottomContent = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: lang ? 'wrap' : 'nowrap' }}>
            <input
              type="radio"
              name={`correct-${q.id}`}
              checked={q.correctIndex === i}
              onChange={() => onChange({ ...q, correctIndex: i })}
              title="סמנו כתשובה נכונה"
              style={{ width: 22, height: 22, flexShrink: 0, accentColor: 'var(--accent)' }}
            />
            <input
              style={{ ...lightBoxStyle, flex: 1, minWidth: 160, borderInlineStart: `4px solid var(--opt-${i})` }}
              placeholder={`תשובה ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const options = [...q.options];
                options[i] = e.target.value;
                onChange({ ...q, options });
              }}
            />
            {lang && (
              <input
                style={{ ...translatedBoxStyle, flex: 1, minWidth: 160, marginInlineStart: 34 }}
                placeholder={lang.answerPlaceholder(i)}
                value={q.optionsTranslated?.[i] || ''}
                onChange={(e) => {
                  const optionsTranslated = [...(q.optionsTranslated || ['', '', '', ''])];
                  optionsTranslated[i] = e.target.value;
                  onChange({ ...q, optionsTranslated });
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="dim">זמן לשאלה (שניות):</span>
          <input
            type="number"
            className="input"
            style={{ width: 80 }}
            min={5}
            max={120}
            value={q.timeLimit}
            onChange={(e) => onChange({ ...q, timeLimit: Number(e.target.value) || 25 })}
          />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" disabled={!valid} onClick={onDone}>
            {doneLabel}
          </button>
          {onCancel && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              ביטול
            </button>
          )}
        </div>
      </div>
    </>
  );

  if (section === 'top') return topContent;
  if (section === 'bottom') return bottomContent;

  return (
    <div className={bare ? undefined : 'card'} style={bare ? undefined : { padding: 22 }}>
      {topContent}
      {bottomContent}
    </div>
  );
}
