import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.js';
import { compressImage } from '../utils/compressImage.js';
import QuestionForm from './QuestionForm.jsx';
import ImageUploadField from './ImageUploadField.jsx';
import { ChevronUpCircleIcon, ChevronDownCircleIcon } from './icons.jsx';

export default function EditingQuestionCard({ q, quizId, onChange, onSave, onCancel, index = 0, total = 1, onMoveUp, onMoveDown, translationLang }) {
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

  const arrowsColumn = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
      <button type="button" onClick={onMoveUp} title="הזז למעלה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === 0 ? 0.35 : 1 }} disabled={index === 0}><ChevronUpCircleIcon size={24} /></button>
      <div style={{ fontWeight: 700, fontSize: 22 }}>{index + 1}</div>
      <button type="button" onClick={onMoveDown} title="הזז למטה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: index === total - 1 ? 0.35 : 1 }} disabled={index === total - 1}><ChevronDownCircleIcon size={24} /></button>
    </div>
  );

  const imageColumn = (
    <div style={{ width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
      <ImageUploadField id={`qimg-${q.id}`} imageURL={q.imageURL} uploading={q.uploading} onUpload={handleImage} radius={12} />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        background: '#2c2251', border: '2px solid #b288ff', borderBottom: 'none', borderRadius: '24px 24px 0 0',
        padding: 24, display: 'flex', gap: 16,
      }}>
        {arrowsColumn}
        {imageColumn}
        <div style={{ flex: 1, minWidth: 0 }}>
          <QuestionForm q={q} quizId={quizId} onChange={onChange} onDone={onSave} doneLabel="✓ שמירה" onCancel={onCancel} hideQuestionImage section="top" translationLang={translationLang} />
        </div>
      </div>
      <div style={{
        background: '#1a1531', border: '2px solid #b288ff', borderTop: 'none', borderRadius: '0 0 24px 24px',
        boxShadow: '0 16px 32px rgba(0,0,0,0.5)', padding: 32,
      }}>
        <QuestionForm q={q} quizId={quizId} onChange={onChange} onDone={onSave} doneLabel="✓ שמירה" onCancel={onCancel} section="bottom" translationLang={translationLang} />
      </div>
    </div>
  );
}
