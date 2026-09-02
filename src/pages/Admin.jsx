import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import PhonePreviewModal from '../components/PhonePreviewModal.jsx';
import QuestionForm from '../components/QuestionForm.jsx';
import EditingQuestionCard from '../components/QuestionEditorCard.jsx';
import { ImageIcon, PlusIcon, EyeIcon, TrashIcon, EditIcon, PlayIcon, CheckIcon, ChevronUpCircleIcon, ChevronDownCircleIcon, SettingsIcon, ShareIcon, CloseIcon } from '../components/icons.jsx';
import ImageUploadField from '../components/ImageUploadField.jsx';
import { compressImage } from '../utils/compressImage.js';
import { generateId, generateUniqueSessionCode, joinUrl } from '../utils/ids.js';
import { DISPLAY_LANGUAGES, displayLanguageLabel } from '../utils/languages.js';
import { QRCodeSVG } from 'qrcode.react';

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
  textTranslated: '',
  optionsTranslated: ['', '', '', ''],
  answerExplanationTranslated: '',
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

function SlideEditor({ q, index, total, quizId, onChange, onSave, onEdit, onDelete, onCancelEdit, onPreview, onMoveUp, onMoveDown, coverImageURL }) {
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
          {q.imageURL || coverImageURL ? (
            <img src={q.imageURL || coverImageURL} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: 100, borderRadius: 12, background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={26} /></div>
          )}
          <button type="button" className="btn btn-secondary" disabled={!q.imageURL && !coverImageURL} onClick={onPreview} style={{ width: '100%', fontSize: 13, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><EyeIcon size={18} /> תצוגה מקדימה</button>
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

function QuestionEditor({ q, index, total, quizId, onChange, onSave, onEdit, onDelete, onCancelEdit, onPreview, onMoveUp, onMoveDown, coverImageURL, translationLang }) {
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
      {q.imageURL || coverImageURL ? (
        <img src={q.imageURL || coverImageURL} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 12, display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 100, borderRadius: 12, background: 'var(--surface-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={26} /></div>
      )}
      <button type="button" className="btn btn-secondary" disabled={!q.options?.some((o) => o.trim())} onClick={onPreview} style={{ width: '100%', fontSize: 13, padding: '10px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><EyeIcon size={18} /> תצוגה מקדימה</button>
    </div>
  );

  const explanationBox = (
    <div style={{ background: 'rgba(37,32,68,0.7)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {(q.answerImageURL || q.imageURL || coverImageURL) && (
        <img src={q.answerImageURL || q.imageURL || coverImageURL} alt="" style={{ width: 150, height: 100, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
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

        {(q.imageURL || coverImageURL) && (
          <img src={q.imageURL || coverImageURL} alt="" style={{ width: '100%', borderRadius: 16, objectFit: 'cover', maxHeight: 220 }} />
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
          <QuestionForm q={q} quizId={quizId} onChange={onChange} onDone={onSave} doneLabel="✓ שמירה" onCancel={onCancelEdit} hideQuestionImage bare translationLang={translationLang} />
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
      translationLang={translationLang}
    />
  );
}

function cleanQuestion(q) {
  if (q.type === 'slide') {
    return { type: 'slide', imageURL: q.imageURL || null, imageSize: q.imageSize === 'full' ? 'full' : 'contained' };
  }
  const {
    text, options, correctIndex, timeLimit, imageURL, answerImageURL, answerExplanation,
    textTranslated, optionsTranslated, answerExplanationTranslated,
  } = q;
  const hasTranslatedOptions = optionsTranslated?.some((o) => o && o.trim());
  return {
    text, options, correctIndex, timeLimit, imageURL: imageURL || null, answerImageURL: answerImageURL || null,
    answerExplanation: answerExplanation || null,
    textTranslated: textTranslated || null,
    optionsTranslated: hasTranslatedOptions ? optionsTranslated.map((o) => o || '') : null,
    answerExplanationTranslated: answerExplanationTranslated || null,
  };
}

function toggleBtnStyle(active) {
  return {
    border: 'none', padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--surface-strong)',
    color: active ? 'white' : 'var(--dim)',
  };
}

// Full settings editor for a quiz (name, cover image, timing, layout options, closing slide).
// Opens as a modal from the quiz list — either for an existing quiz ("עריכת הגדרות") or for a
// brand new one ("הוסף חידון חדש"), in which case it creates the quiz document once a title is set.
function QuizSettingsModal({ quiz, onClose, onGoToQuestions }) {
  const [quizId] = useState(() => quiz?.id || generateId());
  const [createdAt] = useState(() => quiz?.createdAt || Date.now());
  const [title, setTitle] = useState(quiz?.title || '');
  const [coverImageURL, setCoverImageURL] = useState(quiz?.coverImageURL || '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [defaultTimeLimit, setDefaultTimeLimit] = useState(quiz?.defaultTimeLimit || 25);
  const [answerButtonStyle, setAnswerButtonStyle] = useState(quiz?.answerButtonStyle || 'text');
  const [questionLayout, setQuestionLayout] = useState(quiz?.questionLayout || 'boxed');
  const [manualTimer, setManualTimer] = useState(quiz?.manualTimer || false);
  const [displayLanguage, setDisplayLanguage] = useState(quiz?.displayLanguage || 'he');
  const [closingSlide, setClosingSlide] = useState(quiz?.closingSlide || null);
  const [closingSlideDraft, setClosingSlideDraft] = useState(null);
  const [autosaved, setAutosaved] = useState(false);
  const [proceeding, setProceeding] = useState(false);

  function startEditClosingSlide() {
    setClosingSlideDraft(closingSlide ? { ...closingSlide, uploading: false } : { imageURL: '', imageSize: 'contained', uploading: false });
  }

  function saveClosingSlideDraft() {
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

  const stateRef = useRef();
  stateRef.current = { title, coverImageURL, defaultTimeLimit, answerButtonStyle, questionLayout, manualTimer, displayLanguage, closingSlide };

  function buildPayload(s) {
    return {
      title: s.title.trim(),
      createdAt,
      coverImageURL: s.coverImageURL || null,
      defaultTimeLimit: s.defaultTimeLimit,
      answerButtonStyle: s.answerButtonStyle,
      questionLayout: s.questionLayout,
      manualTimer: !!s.manualTimer,
      displayLanguage: s.displayLanguage || 'he',
      closingSlide: s.closingSlide?.imageURL ? { imageURL: s.closingSlide.imageURL, imageSize: s.closingSlide.imageSize === 'full' ? 'full' : 'contained' } : null,
    };
  }

  async function persist(s = stateRef.current) {
    if (!s.title.trim()) return;
    // Only the settings fields are touched here — questions and joinCode belong to other
    // editors (the question builder, the list card), so update() rather than set().
    await update(ref(db, `quizzes/${quizId}`), buildPayload(s));
    setAutosaved(true);
  }

  const initialSnapshotRef = useRef(null);
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = JSON.stringify(stateRef.current);
  }

  useEffect(() => {
    if (!title.trim()) return;
    if (JSON.stringify(stateRef.current) === initialSnapshotRef.current) return;
    const timer = setTimeout(() => { persist(); }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, coverImageURL, defaultTimeLimit, answerButtonStyle, questionLayout, manualTimer, displayLanguage, closingSlide]);

  useEffect(() => {
    return () => {
      if (JSON.stringify(stateRef.current) !== initialSnapshotRef.current) persist();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleClose() {
    if (JSON.stringify(stateRef.current) !== initialSnapshotRef.current) await persist();
    onClose();
  }

  async function handleDeleteQuiz() {
    if (!confirm('למחוק את החידון? הפעולה לא ניתנת לביטול.')) return;
    await remove(ref(db, `quizzes/${quizId}`));
    onClose();
  }

  async function handleGoToQuestions() {
    if (!title.trim()) return;
    setProceeding(true);
    try {
      await persist();
      onGoToQuestions({ id: quizId, ...buildPayload(stateRef.current), questions: quiz?.questions || [] });
    } finally {
      setProceeding(false);
    }
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto',
      }}>
        <div className="card pop-in" style={{ width: '100%', maxWidth: 640, padding: 28, display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '90vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="title" style={{ fontSize: 22 }}>⚙️ הגדרות חידון</div>
            <button type="button" onClick={handleClose} title="סגירה" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CloseIcon size={18} /></button>
          </div>

          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 188, flexShrink: 0 }}>
              <ImageUploadField id="cover-image" imageURL={coverImageURL} uploading={uploadingCover} onUpload={handleCoverImage} height={125} radius={12} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <input
                className="input"
                style={{ width: '100%', fontSize: 20, fontWeight: 700, textAlign: 'right' }}
                placeholder="שם החידון"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: manualTimer ? 0.4 : 1, pointerEvents: manualTimer ? 'none' : 'auto' }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>זמן ברירת מחדל לשאלה (שניות):</span>
              <input
                type="number"
                className="input"
                style={{ width: 80 }}
                min={5}
                max={120}
                value={defaultTimeLimit}
                onChange={(e) => setDefaultTimeLimit(Number(e.target.value) || 25)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>מגבלת זמן לשאלה:</span>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setManualTimer(false)} style={toggleBtnStyle(!manualTimer)}>עם טיימר</button>
                <button
                  type="button"
                  onClick={() => setManualTimer(true)}
                  title="אין ספירה לאחור לשאלה. המעבר לתשובה ולשאלה הבאה נשלט ידנית ע״י המנחה בלבד."
                  style={toggleBtnStyle(manualTimer)}
                >
                  ללא הגבלת זמן (ידני)
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>שפת מסך המנחה:</span>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                {Object.values(DISPLAY_LANGUAGES).map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setDisplayLanguage(l.code)}
                    title={l.code === 'he' ? '' : `כל שדה בשאלה יוקלד גם בעברית וגם ב${l.label}. במסך המנחה יוצג ה${l.label}; בטלפון של השחקנים תמיד יוצג עברית.`}
                    style={toggleBtnStyle(displayLanguage === l.code)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>כפתורי תשובה בפלאפון:</span>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setAnswerButtonStyle('text')} style={toggleBtnStyle(answerButtonStyle === 'text')}>טקסט מלא</button>
                <button type="button" onClick={() => setAnswerButtonStyle('shape')} style={toggleBtnStyle(answerButtonStyle === 'shape')}>צורה וצבע בלבד</button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="dim" style={{ fontSize: 14, fontWeight: 600 }}>תצוגת שאלה במסך המנחה:</span>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setQuestionLayout('boxed')} style={toggleBtnStyle(questionLayout === 'boxed')}>רגיל (ממוסגר)</button>
                <button
                  type="button"
                  onClick={() => setQuestionLayout('full')}
                  title="התמונה תמלא את כל המסך כרקע, והשאלה+תשובות יצופו למטה. רלוונטי רק למסך המנחה/מקרן."
                  style={toggleBtnStyle(questionLayout === 'full')}
                >
                  רקע מלא מסך
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="dim" style={{ fontSize: 13 }}>{autosaved ? '✓ נשמר אוטומטית' : ' '}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="btn btn-secondary" onClick={handleClose}>סגירה</button>
                <button type="button" className="btn" disabled={!title.trim() || proceeding} onClick={handleGoToQuestions} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {proceeding ? 'שומר...' : <>הוספת שאלות ⟶</>}
                </button>
              </div>
              {quiz && (
                <button
                  type="button"
                  onClick={handleDeleteQuiz}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ef4444', fontSize: 12, textDecoration: 'underline' }}
                >
                  מחיקת חידון
                </button>
              )}
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
                <button type="button" onClick={() => setClosingSlideDraft((d) => ({ ...d, imageSize: 'contained' }))} style={toggleBtnStyle(closingSlideDraft.imageSize !== 'full')}>כמו בשאלה</button>
                <button type="button" onClick={() => setClosingSlideDraft((d) => ({ ...d, imageSize: 'full' }))} style={toggleBtnStyle(closingSlideDraft.imageSize === 'full')}>מסך מלא</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" disabled={!closingSlideDraft.imageURL} onClick={saveClosingSlideDraft} style={{ flex: 1 }}>✓ שמירה</button>
              <button type="button" className="btn btn-secondary" onClick={() => setClosingSlideDraft(null)}>ביטול</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Shared header bar for both admin pages: a title (with breadcrumb underneath, optional) on the
// right and page actions on the left.
function HeaderBar({ title, breadcrumb, left }) {
  return (
    <div style={{
      width: '100%', background: '#1a1531', border: '1px solid #342e5b', borderRadius: 16,
      padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 16,
    }}>
      <div style={{ textAlign: 'right' }}>
        <div className="title" style={{ fontSize: 22, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
          {title} <SettingsIcon size={20} />
        </div>
        {breadcrumb && <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{breadcrumb}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>{left}</div>
    </div>
  );
}

// Question/slide builder for an existing quiz. Settings (name, timing, layout, closing slide)
// live in QuizSettingsModal — this page only ever touches the `questions` field.
function QuestionsBuilder({ quiz, onDone, onEditSettings }) {
  const navigate = useNavigate();
  const quizId = quiz.id;
  const translationLang = quiz.displayLanguage && quiz.displayLanguage !== 'he' ? quiz.displayLanguage : null;
  const [questions, setQuestions] = useState(() =>
    quiz.questions?.length
      ? quiz.questions.map((q) => ({
          ...q, id: generateId(), imageURL: q.imageURL || '', answerImageURL: q.answerImageURL || '',
          answerExplanation: q.answerExplanation || '', textTranslated: q.textTranslated || '',
          optionsTranslated: q.optionsTranslated || ['', '', '', ''], answerExplanationTranslated: q.answerExplanationTranslated || '',
          saved: true, uploading: false, uploadingAnswer: false,
        }))
      : [emptyQuestion(quiz.defaultTimeLimit || 25)]
  );
  const [previewIndex, setPreviewIndex] = useState(null);
  const [phonePreviewIndex, setPhonePreviewIndex] = useState(null);
  const [autosaved, setAutosaved] = useState(false);

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
      return q.type === 'slide' ? emptySlide() : emptyQuestion(quiz.defaultTimeLimit || 25);
    }));
  }

  function deleteQuestion(idx) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion(quiz.defaultTimeLimit || 25)]);
  }

  function addSlide() {
    setQuestions((qs) => [...qs, emptySlide()]);
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

  const savedCount = questions.filter((q) => q.saved).length;
  const canAddNext = questions.length > 0 && questions[questions.length - 1].saved;
  const canSaveQuiz = savedCount > 0 && questions.every((q) => q.saved);

  const stateRef = useRef();
  stateRef.current = { questions };

  async function persistQuestions(s = stateRef.current) {
    // Only the `questions` field is touched here — settings and joinCode belong to other editors.
    await update(ref(db, `quizzes/${quizId}`), { questions: s.questions.map(cleanQuestion) });
    setAutosaved(true);
  }

  const initialSnapshotRef = useRef(null);
  if (initialSnapshotRef.current === null) {
    initialSnapshotRef.current = JSON.stringify(stateRef.current);
  }

  useEffect(() => {
    if (JSON.stringify(stateRef.current) === initialSnapshotRef.current) return;
    const timer = setTimeout(() => { persistQuestions(); }, 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions]);

  useEffect(() => {
    return () => {
      if (JSON.stringify(stateRef.current) !== initialSnapshotRef.current) persistQuestions();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveQuiz() {
    await persistQuestions();
    onDone();
  }

  // Passed as QuizCardBody's onLaunch — pin is already resolved there; this launches with the
  // live (possibly not-yet-autosaved) question edits rather than the quiz prop's snapshot.
  async function handleLaunch(pin) {
    await set(ref(db, `sessions/${pin}`), {
      quizId,
      quiz: {
        title: quiz.title, questions: questions.filter((q) => q.saved).map(cleanQuestion),
        coverImageURL: quiz.coverImageURL || null, answerButtonStyle: quiz.answerButtonStyle || 'text',
        questionLayout: quiz.questionLayout || 'boxed', manualTimer: !!quiz.manualTimer,
        displayLanguage: quiz.displayLanguage || 'he', closingSlide: quiz.closingSlide || null,
      },
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
  }

  // Reflects live (not-yet-autosaved) question edits, so the card's saved-question count and
  // its preview/launch buttons stay accurate while you're actively editing below.
  const liveQuiz = { ...quiz, questions: questions.filter((q) => q.saved).map(cleanQuestion) };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%', maxWidth: 1000 }}>
      <HeaderBar
        title="עריכת שאלון"
        breadcrumb={(
          <>
            <span>ניהול חידונים</span>
            <span> / </span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onDone}>החידונים שלי</span>
            <span> / </span>
            <span>{quiz.title}</span>
          </>
        )}
        left={(
          <>
            <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addSlide} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>הוסף סלייד חדש</span>
              <ImageIcon size={20} />
            </button>
            <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>הוסף שאלה חדשה</span>
              <PlusIcon size={22} />
            </button>
          </>
        )}
      />

      <QuizCardBody
        quiz={liveQuiz}
        onEditSettings={onEditSettings}
        onPreview={() => setPreviewIndex(0)}
        onPhonePreview={() => setPhonePreviewIndex(0)}
        onLaunch={handleLaunch}
      />

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
            coverImageURL={quiz.coverImageURL}
            translationLang={translationLang}
          />
        );
      })}

      <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <PlusIcon size={22} /> הוסף שאלה הבאה
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="btn" disabled={!canSaveQuiz} onClick={saveQuiz} style={{ fontSize: 18 }}>
          💾 סיום עריכה ({savedCount} שאלות)
        </button>
        {autosaved && <span className="dim" style={{ fontSize: 13 }}>✓ הכל נשמר אוטומטית</span>}
      </div>

      {previewIndex !== null && (
        <PreviewModal
          questions={questions}
          startIndex={previewIndex}
          quizId={quizId}
          quizTitle={quiz.title}
          onSaveQuestion={(idx, updated) => updateQuestion(idx, updated)}
          onClose={() => setPreviewIndex(null)}
          coverImageURL={quiz.coverImageURL}
          questionLayout={quiz.questionLayout}
          manualTimer={quiz.manualTimer}
          displayLanguage={quiz.displayLanguage}
        />
      )}

      {phonePreviewIndex !== null && (
        <PhonePreviewModal
          questions={questions}
          startIndex={phonePreviewIndex}
          quizTitle={quiz.title}
          coverImageURL={quiz.coverImageURL}
          answerButtonStyle={quiz.answerButtonStyle}
          displayLanguage={quiz.displayLanguage}
          onClose={() => setPhonePreviewIndex(null)}
        />
      )}
    </div>
  );
}

// One quiz row in the list: thumbnail, question count, its permanent join link/QR, and actions.
// The quiz identity card: thumbnail, name, settings summary, action buttons, and the permanent
// join link/QR. Shared by the quiz list (with move arrows and an "add questions" button) and the
// top of the question builder (without either — you're already there).
function QuizCardBody({ quiz, onEditQuestions, onEditSettings, onPreview, onPhonePreview, onLaunch, onMoveUp, onMoveDown, moveUpDisabled, moveDownDisabled }) {
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);
  const [joinCode, setJoinCode] = useState(quiz.joinCode || null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setJoinCode(quiz.joinCode || null);
  }, [quiz.joinCode]);

  // Every quiz gets a permanent join code/link/QR as soon as it appears here, so it can
  // be shared before the game is even launched, and stays valid across relaunches.
  useEffect(() => {
    if (joinCode) return;
    let cancelled = false;
    generateUniqueSessionCode().then(async (code) => {
      if (cancelled) return;
      setJoinCode(code);
      await update(ref(db, `quizzes/${quiz.id}`), { joinCode: code });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.id]);

  async function resetJoinCode() {
    if (!confirm('לאפס את הקישור? הקישור וה-QR הישנים יפסיקו לעבוד.')) return;
    const oldCode = joinCode;
    const newCode = await generateUniqueSessionCode();
    setJoinCode(newCode);
    await update(ref(db, `quizzes/${quiz.id}`), { joinCode: newCode });
    if (oldCode) {
      try { await remove(ref(db, `sessions/${oldCode}`)); } catch (err) { console.error(err); }
    }
  }

  async function copyJoinLink() {
    try {
      await navigator.clipboard.writeText(joinUrl(joinCode));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    try {
      let pin = joinCode;
      if (!pin) {
        pin = await generateUniqueSessionCode();
        setJoinCode(pin);
        await update(ref(db, `quizzes/${quiz.id}`), { joinCode: pin });
      }
      if (onLaunch) {
        // The question builder passes this so a launch uses its live (possibly not-yet-autosaved)
        // question edits, rather than the quiz snapshot this card was handed.
        await onLaunch(pin);
        return;
      }
      await set(ref(db, `sessions/${pin}`), {
        quizId: quiz.id,
        quiz: {
          title: quiz.title, questions: quiz.questions || [], coverImageURL: quiz.coverImageURL || null,
          answerButtonStyle: quiz.answerButtonStyle || 'text', questionLayout: quiz.questionLayout || 'boxed',
          manualTimer: !!quiz.manualTimer, displayLanguage: quiz.displayLanguage || 'he',
          closingSlide: quiz.closingSlide || null,
        },
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

  const infoLine = [
    `${quiz.questions?.length || 0} שאלות`,
    quiz.manualTimer ? 'ללא טיימר' : 'עם טיימר',
    quiz.questionLayout === 'full' ? 'רקע מלא' : 'תצוגה רגילה',
    `בפלאפון: ${quiz.answerButtonStyle === 'shape' ? 'צורה וצבע בלבד' : 'טקסט מלא'}`,
    `שפת מסך: ${displayLanguageLabel(quiz.displayLanguage)}`,
  ].join(' | ');

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16 }}>
        <div style={{ width: 130, flexShrink: 0, position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1280 / 850', background: 'var(--surface-strong)' }}>
          {quiz.coverImageURL ? (
            <img src={quiz.coverImageURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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

        <div style={{ flex: 1, minWidth: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: 22 }}>{quiz.title}</div>
          <div className="dim" style={{ fontSize: 13, fontWeight: 600 }}>{infoLine}</div>
        </div>

        {onMoveUp && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}>
            <button type="button" disabled={moveUpDisabled} onClick={onMoveUp} title="הזז למעלה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: moveUpDisabled ? 0.35 : 1 }}><ChevronUpCircleIcon size={24} /></button>
            <button type="button" disabled={moveDownDisabled} onClick={onMoveDown} title="הזז למטה" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: moveDownDisabled ? 0.35 : 1 }}><ChevronDownCircleIcon size={24} /></button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-secondary" onClick={onEditSettings} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SettingsIcon size={18} /> עריכת הגדרות</button>
        {onEditQuestions && (
          <button type="button" className="btn btn-secondary" onClick={onEditQuestions} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><EditIcon size={18} /> עריכת שאלות</button>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!quiz.questions?.length}
          onClick={onPreview}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <EyeIcon size={19} /> תצוגה מקדימה
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!quiz.questions?.length}
          onClick={onPhonePreview}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          📱 תצוגה בנייד
        </button>
        <button
          type="button"
          className="btn"
          disabled={!quiz.questions?.length || launching}
          onClick={handleLaunch}
          style={{ boxShadow: '0 4px 12px rgba(142,45,226,0.5)', display: 'flex', alignItems: 'center', gap: 6, padding: '10px 22px' }}
        >
          {launching ? 'מפעיל...' : (<><PlayIcon size={19} /> הפעל חידון</>)}
        </button>
      </div>

      {joinCode && (
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, flexWrap: 'wrap', background: 'var(--surface-strong)', borderRadius: 14, padding: 14 }}>
          <div style={{ background: 'white', borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
            <QRCodeSVG value={joinUrl(joinCode)} size={64} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 220, justifyContent: 'center' }}>
            <span className="dim" style={{ fontSize: 13, fontWeight: 600 }}>קישור קבוע להצטרפות — אותו קישור בכל הפעלה, אפשר לשתף מראש</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <code style={{ fontSize: 13, background: 'var(--bg-1)', padding: '5px 10px', borderRadius: 6, direction: 'ltr', flex: 1, minWidth: 160 }}>{joinUrl(joinCode)}</code>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5 }} onClick={copyJoinLink}>
                <ShareIcon size={14} /> {linkCopied ? 'הועתק ✓' : 'העתק קישור'}
              </button>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={resetJoinCode}>
                🔄 אפס לינק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuizCard({ quiz, index, total, onMoveUp, onMoveDown, onEditQuestions, onEditSettings, onPreview, onPhonePreview }) {
  return (
    <QuizCardBody
      quiz={quiz}
      onEditQuestions={onEditQuestions}
      onEditSettings={onEditSettings}
      onPreview={onPreview}
      onPhonePreview={onPhonePreview}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      moveUpDisabled={index === 0}
      moveDownDisabled={index === total - 1}
    />
  );
}

function QuizList({ quizzes, onEditQuestions, onEditSettings, onAddNew }) {
  const [previewQuiz, setPreviewQuiz] = useState(null);
  const [phonePreviewQuiz, setPhonePreviewQuiz] = useState(null);

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
      <HeaderBar
        title="ניהול חידונים"
        left={(
          <>
            <Link to="/" className="dim" style={{ textDecoration: 'none', fontSize: 14 }}>חזרה</Link>
            <button type="button" className="btn btn-secondary" onClick={onAddNew} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>הוסף חידון חדש</span>
              <PlusIcon size={22} />
            </button>
          </>
        )}
      />

      {!quizzes.length ? (
        <div className="dim">עדיין אין חידונים שמורים.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%' }}>
          {quizzes.map((q, idx) => (
            <QuizCard
              key={q.id}
              quiz={q}
              index={idx}
              total={quizzes.length}
              onMoveUp={() => moveQuiz(idx, -1)}
              onMoveDown={() => moveQuiz(idx, 1)}
              onEditQuestions={() => onEditQuestions(q)}
              onEditSettings={() => onEditSettings(q)}
              onPreview={() => setPreviewQuiz(q)}
              onPhonePreview={() => setPhonePreviewQuiz(q)}
            />
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
          coverImageURL={previewQuiz.coverImageURL}
          questionLayout={previewQuiz.questionLayout}
          manualTimer={previewQuiz.manualTimer}
          displayLanguage={previewQuiz.displayLanguage}
        />
      )}

      {phonePreviewQuiz && (
        <PhonePreviewModal
          questions={phonePreviewQuiz.questions}
          startIndex={0}
          quizTitle={phonePreviewQuiz.title}
          coverImageURL={phonePreviewQuiz.coverImageURL}
          answerButtonStyle={phonePreviewQuiz.answerButtonStyle}
          displayLanguage={phonePreviewQuiz.displayLanguage}
          onClose={() => setPhonePreviewQuiz(null)}
        />
      )}
    </div>
  );
}

function AdminInner() {
  const [quizzes, setQuizzes] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [settingsTarget, setSettingsTarget] = useState(null); // null | 'new' | quiz object

  useEffect(() => {
    const quizzesRef = ref(db, 'quizzes');
    return onValue(quizzesRef, (snap) => {
      const val = snap.val() || {};
      const order = (q) => (q.order ?? -q.createdAt);
      setQuizzes(Object.entries(val).map(([id, v]) => ({ id, ...v })).sort((a, b) => order(a) - order(b)));
    });
  }, []);

  function editQuestions(quiz) {
    setEditingQuiz(quiz);
    setMode('builder');
  }

  function goToList() {
    setMode('list');
  }

  function handleGoToQuestions(savedQuiz) {
    setSettingsTarget(null);
    setEditingQuiz(savedQuiz);
    setMode('builder');
  }

  return (
    <div className="screen">
      {mode === 'list' ? (
        <QuizList
          quizzes={quizzes}
          onEditQuestions={editQuestions}
          onEditSettings={(quiz) => setSettingsTarget(quiz)}
          onAddNew={() => setSettingsTarget('new')}
        />
      ) : (
        <QuestionsBuilder key={editingQuiz.id} quiz={editingQuiz} onDone={goToList} onEditSettings={() => setSettingsTarget(editingQuiz)} />
      )}

      {settingsTarget && (
        <QuizSettingsModal
          quiz={settingsTarget === 'new' ? null : settingsTarget}
          onClose={() => setSettingsTarget(null)}
          onGoToQuestions={handleGoToQuestions}
        />
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
