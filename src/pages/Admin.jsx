import { useEffect, useState } from 'react';
import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import QuestionForm from '../components/QuestionForm.jsx';
import EditingQuestionCard from '../components/QuestionEditorCard.jsx';
import { ImageIcon, PlusIcon, EyeIcon, TrashIcon, EditIcon, PlayIcon, CheckIcon, ChevronUpCircleIcon, ChevronDownCircleIcon, SettingsIcon } from '../components/icons.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import { compressImage } from '../utils/compressImage.js';
import { generateId, generatePin } from '../utils/ids.js';

function useIsMobile(breakpoint = 700) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

const emptyQuestion = (timeLimit = 25) => ({
  id: generateId(),
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  timeLimit,
  imageURL: '',
  answerImageURL: '',
  answerExplanation: '',
  saved: false,
  uploading: false,
  uploadingAnswer: false,
});

const emptySlide = () => ({
  id: generateId(),
  type: 'slide',
  imageURL: '',
  imageSize: 'contained',
  saved: false,
  uploading: false,
});

function SlideEditor({ q, index, total, quizId, onChange, onSave, onEdit, onDelete, onCancelEdit, onPreview, onMoveUp, onMoveDown }) {
  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({ ...q, uploading: true });
    try {
      const blob = await compressImage(file, { maxDim: 1600, quality: 0.85 });
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

  const sizeLabel = q.imageSize === 'full' ? 'מסך מלא' : 'כמו בשאלה';

  if (q.saved) {
    return (
      <div className="card" style={{ padding: 24, display: 'flex', gap: 16 }}>
        {arrowsColumn}
        <div style={{ width: 150, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
          {q.imageURL ? (
            <img src={q.imageURL} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 100, borderRadius: 12, background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={26} /></div>
          )}
          <button type="button" className="btn btn-secondary" disabled={!q.imageURL} onClick={onPreview} style={{ width: '100%', fontSize: 13, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><EyeIcon size={18} /> תצוגה מקדימה</button>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 18, textAlign: 'right' }}>סלייד תמונה · {sizeLabel}</div>
          <button type="button" className="btn btn-secondary" onClick={onEdit} style={{ fontSize: 14, padding: '10px 18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}><EditIcon size={18} /> עריכת סלייד</button>
          <button type="button" className="btn btn-secondary" onClick={onDelete} title="מחיקה" style={{ padding: '10px 16px' }}><TrashIcon size={20} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 24, display: 'flex', gap: 16 }}>
      {arrowsColumn}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="dim" style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>סלייד תמונה (בלי שאלה או תשובות)</div>
        <ImageUploadField id={`slideimg-${q.id}`} imageURL={q.imageURL} uploading={q.uploading} onUpload={handleImage} height={220} radius={16} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>גודל התמונה:</span>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => onChange({ ...q, imageSize: 'contained' })}
              style={{
                border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: q.imageSize !== 'full' ? 'var(--accent)' : 'var(--surface-strong)',
                color: q.imageSize !== 'full' ? 'white' : 'var(--dim)',
              }}
            >
              כמו בשאלה
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...q, imageSize: 'full' })}
              style={{
                border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: q.imageSize === 'full' ? 'var(--accent)' : 'var(--surface-strong)',
                color: q.imageSize === 'full' ? 'white' : 'var(--dim)',
              }}
            >
              מסך מלא
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn" disabled={!q.imageURL} onClick={onSave} style={{ flex: 1 }}>✓ שמירה</button>
          <button type="button" className="btn btn-secondary" onClick={onCancelEdit}>ביטול</button>
        </div>
      </div>
    </div>
  );
}

function QuestionEditor({ q, index, total, quizId, onChange, onSave, onEdit, onDelete, onCancelEdit, onPreview, onMoveUp, onMoveDown }) {
  const isMobile = useIsMobile();

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
      {q.imageURL ? (
        <img src={q.imageURL} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 100, borderRadius: 12, background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={26} /></div>
      )}
      <button type="button" className="btn btn-secondary" disabled={!q.options?.some((o) => o.trim())} onClick={onPreview} style={{ width: '100%', fontSize: 13, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><EyeIcon size={18} /> תצוגה מקדימה</button>
    </div>
  );

  const explanationBox = (
    <div style={{ background: 'rgba(37,32,68,0.7)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {q.answerImageURL && (
        <img src={q.answerImageURL} alt="" style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0, color: `var(--opt-${q.correctIndex})`, fontWeight: 700, fontSize: 15, textAlign: 'right' }}>{q.options[q.correctIndex]}</div>
          <div style={{ flexShrink: 0, color: '#22c55e', display: 'flex' }}><CheckIcon size={20} /></div>
        </div>
        {q.answerExplanation && (
          <div style={{ background: 'var(--surface-strong)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', textAlign: 'right' }}>
            <div className="dim" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>הסבר לתשובה:</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{q.answerExplanation}</div>
          </div>
        )}
      </div>
    </div>
  );

  if (q.saved && isMobile) {
    return (
      <div className="card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onDelete} title="מחיקה" style={{ border: '1px solid var(--border)', borderRadius: 10, width: 44, height: 44, background: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon size={20} /></button>
          <button type="button" onClick={onEdit} title="עריכת שאלה" style={{ border: '1px solid var(--border)', borderRadius: 10, width: 44, height: 44, background: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon size={20} /></button>
        </div>

        {q.imageURL && (
          <img src={q.imageURL} alt="" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 220 }} />
        )}

        <div style={{ fontWeight: 700, fontSize: 18, textAlign: 'right' }}>{index + 1}. {q.text}</div>

        {explanationBox}
      </div>
    );
  }

  if (q.saved) {
    return (
      <div className="card" style={{ padding: 24, display: 'flex', gap: 16 }}>
        {arrowsColumn}
        {imageColumn}

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
            <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 18, textAlign: 'right' }}>{q.text}</div>
            <button type="button" className="btn btn-secondary" onClick={onEdit} style={{ fontSize: 14, padding: '10px 18px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}><EditIcon size={18} /> עריכת שאלה</button>
            <button type="button" className="btn btn-secondary" onClick={onDelete} title="מחיקה" style={{ padding: '10px 16px' }}><TrashIcon size={20} /></button>
          </div>

          {explanationBox}
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000, overflowY: 'auto', background: 'var(--bg-1)',
        backgroundImage: 'radial-gradient(1200px 800px at 15% -10%, var(--bg-3), transparent), radial-gradient(1000px 700px at 110% 10%, #4c1d95aa, transparent)',
      }}>
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '20px 16px 40px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button type="button" onClick={onDelete} title="מחיקה" style={{ border: '1px solid var(--border)', borderRadius: 10, width: 44, height: 44, background: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><TrashIcon size={20} /></button>
            <button type="button" onClick={onCancelEdit} title="ביטול עריכה" style={{ border: '1px solid var(--border)', borderRadius: 10, width: 44, height: 44, background: 'none', cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><EditIcon size={20} /></button>
          </div>
          <div style={{ marginBottom: 16 }}>
            <ImageUploadField id={`qimg-mobile-${q.id}`} imageURL={q.imageURL} uploading={q.uploading} onUpload={handleImage} height={180} radius={16} />
          </div>
          <QuestionForm q={q} quizId={quizId} onChange={onChange} onDone={onSave} doneLabel="✓ שמירה" onCancel={onCancelEdit} hideQuestionImage bare />
        </div>
      </div>
    );
  }

  return (
    <EditingQuestionCard
      q={q}
      quizId={quizId}
      onChange={onChange}
      onSave={onSave}
      onCancel={onCancelEdit}
      index={index}
      total={total}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    />
  );
}

function cleanQuestion(q) {
  if (q.type === 'slide') {
    return { type: 'slide', imageURL: q.imageURL || null, imageSize: q.imageSize === 'full' ? 'full' : 'contained' };
  }
  const { text, options, correctIndex, timeLimit, imageURL, answerImageURL, answerExplanation } = q;
  return {
    text, options, correctIndex, timeLimit, imageURL: imageURL || null, answerImageURL: answerImageURL || null,
    answerExplanation: answerExplanation || null,
  };
}

function QuizBuilder({ onDone, onBackToList, existingQuiz }) {
  const navigate = useNavigate();
  const [quizId] = useState(() => existingQuiz?.id || generateId());
  const [title, setTitle] = useState(existingQuiz?.title || '');
  const [coverImageURL, setCoverImageURL] = useState(existingQuiz?.coverImageURL || '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(existingQuiz?.defaultTimeLimit || 25);
  const [answerButtonStyle, setAnswerButtonStyle] = useState(existingQuiz?.answerButtonStyle || 'text');
  const [closingSlide, setClosingSlide] = useState(existingQuiz?.closingSlide || null);
  const [closingSlideDraft, setClosingSlideDraft] = useState(null);
  const [questions, setQuestions] = useState(() =>
    existingQuiz?.questions?.length
      ? existingQuiz.questions.map((q) => ({
          ...q, id: generateId(), imageURL: q.imageURL || '', answerImageURL: q.answerImageURL || '',
          answerExplanation: q.answerExplanation || '', saved: true, uploading: false, uploadingAnswer: false,
        }))
      : [emptyQuestion(existingQuiz?.defaultTimeLimit || 25)]
  );
  const [previewIndex, setPreviewIndex] = useState(null);
  const [launching, setLaunching] = useState(false);

  function updateQuestion(idx, updated) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? updated : q)));
  }

  function saveQuestion(idx) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, saved: true } : q)));
  }

  function editQuestion(idx) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, saved: false, _snapshot: { ...q } } : q)));
  }

  function cancelEditQuestion(idx) {
    setQuestions((qs) => qs.map((q, i) => {
      if (i !== idx) return q;
      if (q._snapshot) return { ...q._snapshot, saved: true };
      return q.type === 'slide' ? emptySlide() : emptyQuestion(defaultTimeLimit);
    }));
  }

  function deleteQuestion(idx) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion(defaultTimeLimit)]);
  }

  function addSlide() {
    setQuestions((qs) => [...qs, emptySlide()]);
  }

  function startEditClosingSlide() {
    setClosingSlideDraft(closingSlide ? { ...closingSlide, uploading: false } : { imageURL: '', imageSize: 'contained', uploading: false });
  }

  function saveClosingSlide() {
    setClosingSlide({ imageURL: closingSlideDraft.imageURL, imageSize: closingSlideDraft.imageSize });
    setClosingSlideDraft(null);
  }

  function removeClosingSlide() {
    setClosingSlide(null);
  }

  async function handleClosingSlideImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setClosingSlideDraft((d) => ({ ...d, uploading: true }));
    try {
      const blob = await compressImage(file, { maxDim: 1600, quality: 0.85 });
      const path = `questions/${quizId}/closing.jpg`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      setClosingSlideDraft((d) => ({ ...d, imageURL: url, uploading: false }));
    } catch (err) {
      console.error(err);
      alert('העלאת התמונה נכשלה');
      setClosingSlideDraft((d) => ({ ...d, uploading: false }));
    }
  }

  function handleDefaultTimeLimitChange(value) {
    const num = Number(value) || 25;
    setDefaultTimeLimit(num);
    setQuestions((qs) => qs.map((q) => ({ ...q, timeLimit: num })));
  }

  function moveQuestion(idx, delta) {
    setQuestions((qs) => {
      const target = idx + delta;
      if (target < 0 || target >= qs.length) return qs;
      const copy = [...qs];
      [copy[idx], copy[target]] = [copy[target], copy[idx]];
      return copy;
    });
  }

  async function handleCoverImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const blob = await compressImage(file, { maxDim: 1920, quality: 0.85 });
      const path = `covers/${quizId}.jpg`;
      const storageRef = sRef(storage, path);
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(storageRef);
      setCoverImageURL(url);
    } catch (err) {
      console.error(err);
      alert('העלאת התמונה נכשלה');
    } finally {
      setUploadingCover(false);
    }
  }

  const savedCount = questions.filter((q) => q.saved).length;
  const canAddNext = questions.length > 0 && questions[questions.length - 1].saved;
  const canSaveQuiz = title.trim() && savedCount > 0 && questions.every((q) => q.saved);

  async function saveQuiz() {
    await set(ref(db, `quizzes/${quizId}`), {
      title: title.trim(),
      createdAt: Date.now(),
      coverImageURL: coverImageURL || null,
      defaultTimeLimit,
      answerButtonStyle,
      closingSlide: closingSlide?.imageURL ? { imageURL: closingSlide.imageURL, imageSize: closingSlide.imageSize === 'full' ? 'full' : 'contained' } : null,
      questions: questions.map(cleanQuestion),
    });
    onDone();
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      let pin = generatePin();
      for (let i = 0; i < 5; i++) {
        const snap = await get(ref(db, `sessions/${pin}`));
        if (!snap.exists()) break;
        pin = generatePin();
      }
      await set(ref(db, `sessions/${pin}`), {
        quizId,
        quiz: { title: title.trim(), questions: questions.filter((q) => q.saved).map(cleanQuestion), coverImageURL: coverImageURL || null, answerButtonStyle, closingSlide: closingSlide?.imageURL ? { imageURL: closingSlide.imageURL, imageSize: closingSlide.imageSize === 'full' ? 'full' : 'contained' } : null },
        status: 'lobby',
        currentIndex: -1,
        questionStartedAt: null,
        players: {},
        answers: {},
        createdAt: Date.now(),
      });
      localStorage.setItem('quiz_presenter_pin', pin);
      sessionStorage.setItem('quiz_admin_ok', '1');
      navigate('/present');
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ fontSize: 14 }}>
          <span className="dim">ניהול חידונים</span>
          <span className="dim"> / </span>
          <span className="dim" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onBackToList}>החידונים שלי</span>
          <span className="dim"> / </span>
          <span style={{ color: '#b288ff', fontWeight: 700 }}>{title.trim() || 'חידון חדש'}</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addSlide} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>הוסף סלייד חדש</span>
            <ImageIcon size={20} />
          </button>
          <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>הוסף שאלה חדשה</span>
            <PlusIcon size={22} />
          </button>
        </div>
      </div>

      <div style={{ padding: 24, borderRadius: 16, border: '1px solid #342e5b', background: '#2c2251' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <SettingsIcon size={18} />
          <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>עריכת הגדרות חידון</span>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 188, flexShrink: 0 }}>
            <ImageUploadField id="cover-image" imageURL={coverImageURL} uploading={uploadingCover} onUpload={handleCoverImage} height={125} radius={12} />
          </div>

          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
            <input
              className="input"
              style={{ width: '100%', fontSize: 20, fontWeight: 700, textAlign: 'right' }}
              placeholder="שם החידון"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div className="dim" style={{ fontSize: 14, fontWeight: 600, textAlign: 'right' }}>{questions.length} שאלות</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>זמן ברירת מחדל לשאלה (שניות):</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: 80 }}
                  min={5}
                  max={120}
                  value={defaultTimeLimit}
                  onChange={(e) => handleDefaultTimeLimitChange(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>כפתורי תשובה בפלאפון:</span>
                <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setAnswerButtonStyle('text')}
                    style={{
                      border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: answerButtonStyle === 'text' ? 'var(--accent)' : 'var(--surface-strong)',
                      color: answerButtonStyle === 'text' ? 'white' : 'var(--dim)',
                    }}
                  >
                    טקסט מלא
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswerButtonStyle('shape')}
                    style={{
                      border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: answerButtonStyle === 'shape' ? 'var(--accent)' : 'var(--surface-strong)',
                      color: answerButtonStyle === 'shape' ? 'white' : 'var(--dim)',
                    }}
                  >
                    צורה וצבע בלבד
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>שקף סיום (אחרי תצוגת הזוכים):</span>
                {closingSlide?.imageURL ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={closingSlide.imageURL} alt="" style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={startEditClosingSlide}>עריכה</button>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '6px 12px' }} onClick={removeClosingSlide}>מחיקה</button>
                  </div>
                ) : (
                  <button type="button" className="btn btn-secondary" style={{ fontSize: 13, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={startEditClosingSlide}>
                    <PlusIcon size={16} /> הוספת שקף סיום
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" disabled={!savedCount} onClick={() => setPreviewIndex(0)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><EyeIcon size={19} /> תצוגה מקדימה</button>
              <button type="button" className="btn" disabled={!savedCount || launching} onClick={handleLaunch} style={{ boxShadow: '0 4px 12px rgba(142,45,226,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {launching ? 'מפעיל...' : (<><PlayIcon size={19} /> הפעל חידון</>)}
              </button>
            </div>
          </div>
        </div>
      </div>

      {closingSlideDraft && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: 600, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="title" style={{ fontSize: 20, textAlign: 'right' }}>שקף סיום</div>
            <ImageUploadField id="closing-slide-img" imageURL={closingSlideDraft.imageURL} uploading={closingSlideDraft.uploading} onUpload={handleClosingSlideImage} height={220} radius={16} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>גודל התמונה:</span>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setClosingSlideDraft((d) => ({ ...d, imageSize: 'contained' }))}
                  style={{
                    border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: closingSlideDraft.imageSize !== 'full' ? 'var(--accent)' : 'var(--surface-strong)',
                    color: closingSlideDraft.imageSize !== 'full' ? 'white' : 'var(--dim)',
                  }}
                >
                  כמו בשאלה
                </button>
                <button
                  type="button"
                  onClick={() => setClosingSlideDraft((d) => ({ ...d, imageSize: 'full' }))}
                  style={{
                    border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: closingSlideDraft.imageSize === 'full' ? 'var(--accent)' : 'var(--surface-strong)',
                    color: closingSlideDraft.imageSize === 'full' ? 'white' : 'var(--dim)',
                  }}
                >
                  מסך מלא
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" disabled={!closingSlideDraft.imageURL} onClick={saveClosingSlide} style={{ flex: 1 }}>✓ שמירה</button>
              <button type="button" className="btn btn-secondary" onClick={() => setClosingSlideDraft(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}

      {questions.map((q, idx) => {
        const Editor = q.type === 'slide' ? SlideEditor : QuestionEditor;
        return (
          <Editor
            key={q.id}
            q={q}
            index={idx}
            total={questions.length}
            quizId={quizId}
            onChange={(u) => updateQuestion(idx, u)}
            onSave={() => saveQuestion(idx)}
            onEdit={() => editQuestion(idx)}
            onDelete={() => deleteQuestion(idx)}
            onCancelEdit={() => cancelEditQuestion(idx)}
            onPreview={() => setPreviewIndex(idx)}
            onMoveUp={() => moveQuestion(idx, -1)}
            onMoveDown={() => moveQuestion(idx, 1)}
          />
        );
      })}

      <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <PlusIcon size={22} /> הוסף שאלה הבאה
      </button>

      <button type="button" className="btn" disabled={!canSaveQuiz} onClick={saveQuiz} style={{ fontSize: 18 }}>
        💾 {existingQuiz ? 'עדכון חידון' : 'שמירת חידון'} ({savedCount} שאלות)
      </button>

      {previewIndex !== null && (
        <PreviewModal
          questions={questions}
          startIndex={previewIndex}
          quizId={quizId}
          quizTitle={title.trim() || 'חידון חדש'}
          onSaveQuestion={(idx, updated) => updateQuestion(idx, updated)}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

function QuizList({ quizzes, onEdit, onAddNew }) {
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [launching, setLaunching] = useState(null);
  const navigate = useNavigate();

  async function handleDelete(id) {
    if (!confirm('למחוק את החידון?')) return;
    await remove(ref(db, `quizzes/${id}`));
  }

  async function handleLaunch(quiz) {
    setLaunching(quiz.id);
    try {
      let pin = generatePin();
      for (let i = 0; i < 5; i++) {
        const snap = await get(ref(db, `sessions/${pin}`));
        if (!snap.exists()) break;
        pin = generatePin();
      }
      await set(ref(db, `sessions/${pin}`), {
        quizId: quiz.id,
        quiz: { title: quiz.title, questions: quiz.questions, coverImageURL: quiz.coverImageURL || null, answerButtonStyle: quiz.answerButtonStyle || 'text', closingSlide: quiz.closingSlide || null },
        status: 'lobby',
        currentIndex: -1,
        questionStartedAt: null,
        players: {},
        answers: {},
        createdAt: Date.now(),
      });
      localStorage.setItem('quiz_presenter_pin', pin);
      sessionStorage.setItem('quiz_admin_ok', '1');
      navigate('/present');
    } finally {
      setLaunching(null);
    }
  }

  async function handleSaveQuestion(idx, updated) {
    const cleaned = {
      text: updated.text, options: updated.options, correctIndex: updated.correctIndex, timeLimit: updated.timeLimit,
      imageURL: updated.imageURL || null, answerImageURL: updated.answerImageURL || null,
      answerExplanation: updated.answerExplanation || null,
    };
    await update(ref(db, `quizzes/${previewQuiz.id}/questions/${idx}`), cleaned);
    setPreviewQuiz((pq) => (pq ? { ...pq, questions: pq.questions.map((qq, i) => (i === idx ? { ...qq, ...cleaned } : qq)) } : pq));
  }

  async function moveQuiz(idx, delta) {
    const target = idx + delta;
    if (target < 0 || target >= quizzes.length) return;
    const a = quizzes[idx];
    const b = quizzes[target];
    const aOrder = a.order ?? -a.createdAt;
    const bOrder = b.order ?? -b.createdAt;
    await Promise.all([
      update(ref(db, `quizzes/${a.id}`), { order: bOrder }),
      update(ref(db, `quizzes/${b.id}`), { order: aOrder }),
    ]);
  }

  return (
    <div style={{ width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ fontSize: 14 }}>
          <span className="dim">ניהול חידונים</span>
          <span className="dim"> / </span>
          <span style={{ color: '#b288ff', fontWeight: 700 }}>החידונים שלי</span>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onAddNew} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>הוסף חידון חדש</span>
          <PlusIcon size={22} />
        </button>
      </div>

      {!quizzes.length ? (
        <div className="dim">עדיין אין חידונים שמורים.</div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
      {quizzes.map((q, idx) => (
        <div key={q.id} className="card" style={{ padding: 24, display: 'flex', alignItems: 'stretch', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
            <button type="button" disabled={idx === 0} onClick={() => moveQuiz(idx, -1)} title="הזז למעלה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === 0 ? 0.35 : 1 }}><ChevronUpCircleIcon size={24} /></button>
            <button type="button" disabled={idx === quizzes.length - 1} onClick={() => moveQuiz(idx, 1)} title="הזז למטה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: idx === quizzes.length - 1 ? 0.35 : 1 }}><ChevronDownCircleIcon size={24} /></button>
          </div>

          <div style={{ width: 160, flexShrink: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1280 / 850', background: 'var(--surface-strong)' }}>
            {q.coverImageURL ? (
              <img src={q.coverImageURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={32} /></div>
            )}
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.15)', pointerEvents: 'none',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
              }}><PlayIcon size={20} /></div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16, justifyContent: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: 22 }}>{q.title}</div>
              <div className="dim" style={{ fontSize: 14, fontWeight: 600 }}>{q.questions?.length || 0} שאלות</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary" onClick={() => onEdit(q)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><EditIcon size={18} /> עריכה / הוספת שאלות</button>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={!q.questions?.length}
                onClick={() => setPreviewQuiz(q)}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <EyeIcon size={19} /> תצוגה מקדימה
              </button>
              <button
                type="button"
                className="btn"
                disabled={!q.questions?.length || launching === q.id}
                onClick={() => handleLaunch(q)}
                style={{ boxShadow: '0 4px 12px rgba(142,45,226,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {launching === q.id ? 'מפעיל...' : (<><PlayIcon size={19} /> הפעל חידון</>)}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => handleDelete(q.id)} title="מחיקה" style={{ padding: '10px 16px' }}><TrashIcon size={20} /></button>
            </div>
          </div>
        </div>
      ))}
      </div>
      )}

      {previewQuiz && (
        <PreviewModal
          questions={previewQuiz.questions}
          startIndex={0}
          quizId={previewQuiz.id}
          quizTitle={previewQuiz.title}
          onSaveQuestion={handleSaveQuestion}
          onClose={() => setPreviewQuiz(null)}
        />
      )}
    </div>
  );
}

function AdminInner() {
  const [quizzes, setQuizzes] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingQuiz, setEditingQuiz] = useState(null);

  useEffect(() => {
    const quizzesRef = ref(db, 'quizzes');
    return onValue(quizzesRef, (snap) => {
      const val = snap.val() || {};
      const order = (q) => (q.order ?? -q.createdAt);
      setQuizzes(Object.entries(val).map(([id, v]) => ({ id, ...v })).sort((a, b) => order(a) - order(b)));
    });
  }, []);

  function startNew() {
    setEditingQuiz(null);
    setMode('builder');
  }

  function startEdit(quiz) {
    setEditingQuiz(quiz);
    setMode('builder');
  }

  return (
    <div className="screen">
      <div style={{ width: '100%', maxWidth: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Link to="/" className="dim" style={{ textDecoration: 'none' }}>← חזרה</Link>
        <div className="title" style={{ fontSize: 26 }}>⚙️ ניהול חידונים</div>
        <div style={{ width: 60 }} />
      </div>

      {mode === 'list' ? (
        <QuizList quizzes={quizzes} onEdit={startEdit} onAddNew={startNew} />
      ) : (
        <QuizBuilder key={editingQuiz?.id || 'new'} existingQuiz={editingQuiz} onDone={() => setMode('list')} onBackToList={() => setMode('list')} />
      )}
    </div>
  );
}

export default function Admin() {
  return (
    <PasswordGate label="כניסת מנהל/ת">
      <AdminInner />
    </PasswordGate>
  );
}
