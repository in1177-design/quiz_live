import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.js';
import { compressImage } from '../utils/compressImage.js';

export default function QuestionForm({ q, quizId, onChange, onDone, doneLabel, onCancel, title }) {
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

  const valid = q.text.trim() && q.options.every((o) => o.trim());

  return (
    <div className="card" style={{ padding: 22 }}>
      {title && (
        <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: 1, marginBottom: 16 }}>{title}</div>
      )}

      <input
        className="input"
        style={{ width: '100%', marginBottom: 16 }}
        placeholder="טקסט השאלה"
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
        <div>
          <input type="file" accept="image/*" id={`img-${q.id}`} style={{ display: 'none' }} onChange={handleImage} />
          <label htmlFor={`img-${q.id}`} className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
            {q.uploading ? 'מעלה תמונה...' : q.imageURL ? '🖼️ החלפת תמונה' : '🖼️ העלאת תמונה (אופציונלי)'}
          </label>
          <div className="dim" style={{ fontSize: 13, marginTop: 6 }}>תמונה נוספת שתופיע רק במסך חשיפת התשובה הנכונה</div>
          {q.imageURL && <img src={q.imageURL} alt="" style={{ display: 'block', marginTop: 10, maxWidth: '100%', borderRadius: 10 }} />}
        </div>

        <div>
          <input type="file" accept="image/*" id={`img-answer-${q.id}`} style={{ display: 'none' }} onChange={handleAnswerImage} />
          <label htmlFor={`img-answer-${q.id}`} className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', width: '100%', textAlign: 'center' }}>
            {q.uploadingAnswer ? 'מעלה תמונה...' : q.answerImageURL ? '🖼️ החלפת תמונת חשיפה' : '🖼️ תמונה למסך התשובה (אופציונלי)'}
          </label>
          {q.answerImageURL && <img src={q.answerImageURL} alt="" style={{ display: 'block', marginTop: 10, maxWidth: '100%', borderRadius: 10 }} />}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="radio"
              name={`correct-${q.id}`}
              checked={q.correctIndex === i}
              onChange={() => onChange({ ...q, correctIndex: i })}
              title="סמנו כתשובה נכונה"
              style={{ width: 22, height: 22, flexShrink: 0, accentColor: 'var(--accent)' }}
            />
            <input
              className="input"
              style={{ width: '100%', borderInlineStart: `4px solid var(--opt-${i})` }}
              placeholder={`תשובה ${i + 1}`}
              value={opt}
              onChange={(e) => {
                const options = [...q.options];
                options[i] = e.target.value;
                onChange({ ...q, options });
              }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <textarea
          className="input"
          style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="כתוב כאן תשובה מורחבת לתצוגה"
          value={q.answerExplanation}
          onChange={(e) => onChange({ ...q, answerExplanation: e.target.value })}
        />
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
    </div>
  );
}
