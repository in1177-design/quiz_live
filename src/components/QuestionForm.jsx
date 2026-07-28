import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.js';
import { compressImage } from '../utils/compressImage.js';

export default function QuestionForm({ q, quizId, onChange, onDone, doneLabel }) {
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
      <input
        className="input"
        style={{ width: '100%', marginBottom: 12 }}
        placeholder="טקסט השאלה"
        value={q.text}
        onChange={(e) => onChange({ ...q, text: e.target.value })}
      />

      <div style={{ marginBottom: 12 }}>
        <input type="file" accept="image/*" id={`img-${q.id}`} style={{ display: 'none' }} onChange={handleImage} />
        <label htmlFor={`img-${q.id}`} className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {q.uploading ? 'מעלה תמונה...' : q.imageURL ? '🖼️ החלפת תמונה' : '🖼️ העלאת תמונה (אופציונלי)'}
        </label>
        {q.imageURL && <img src={q.imageURL} alt="" style={{ display: 'block', marginTop: 10, maxWidth: 200, borderRadius: 10 }} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {q.options.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="radio"
              name={`correct-${q.id}`}
              checked={q.correctIndex === i}
              onChange={() => onChange({ ...q, correctIndex: i })}
              title="סמנו כתשובה נכונה"
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
        <input type="file" accept="image/*" id={`img-answer-${q.id}`} style={{ display: 'none' }} onChange={handleAnswerImage} />
        <label htmlFor={`img-answer-${q.id}`} className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {q.uploadingAnswer ? 'מעלה תמונה...' : q.answerImageURL ? '🖼️ החלפת תמונת חשיפה' : '🖼️ תמונה למסך התשובה (אופציונלי)'}
        </label>
        <div className="dim" style={{ fontSize: 13, marginTop: 6 }}>תמונה נוספת שתופיע רק במסך חשיפת התשובה הנכונה</div>
        {q.answerImageURL && <img src={q.answerImageURL} alt="" style={{ display: 'block', marginTop: 10, maxWidth: 200, borderRadius: 10 }} />}
        <textarea
          className="input"
          style={{ width: '100%', marginTop: 10, minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }}
          placeholder="טקסט הסבר לתשובה (אופציונלי) — יופיע במסך חשיפת התשובה"
          value={q.answerExplanation}
          onChange={(e) => onChange({ ...q, answerExplanation: e.target.value })}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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

      <button type="button" className="btn" disabled={!valid} onClick={onDone}>
        {doneLabel}
      </button>
    </div>
  );
}
