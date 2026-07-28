import { useEffect, useState } from 'react';
import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { ref as sRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Link, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import PreviewModal from '../components/PreviewModal.jsx';
import QuestionForm from '../components/QuestionForm.jsx';
import { compressImage } from '../utils/compressImage.js';
import { generateId, generatePin } from '../utils/ids.js';

const emptyQuestion = () => ({
  id: generateId(),
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  timeLimit: 25,
  imageURL: '',
  answerImageURL: '',
  answerExplanation: '',
  saved: false,
  uploading: false,
  uploadingAnswer: false,
});

function QuestionEditor({ q, index, total, quizId, onChange, onSave, onEdit, onDelete, onPreview, onMoveUp, onMoveDown }) {
  if (q.saved) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 10 }}>{q.text}</div>
            <div style={{ color: `var(--opt-${q.correctIndex})`, fontWeight: 600, marginBottom: q.answerExplanation ? 10 : 0 }}>
              ✅ {q.options[q.correctIndex]}
            </div>
            {q.answerExplanation && (
              <>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>הסבר לתשובה:</div>
                <div className="dim" style={{ fontSize: 14 }}>{q.answerExplanation}</div>
              </>
            )}
          </div>
          {q.imageURL && (
            <img src={q.imageURL} alt="" style={{ width: 150, height: 100, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <button type="button" className="btn-secondary" disabled={index === 0} onClick={onMoveUp} title="הזז למעלה" style={{ border: '1px solid var(--border)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text)' }}>▲</button>
            <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--accent)' }}>{index + 1}</div>
            <button type="button" className="btn-secondary" disabled={index === total - 1} onClick={onMoveDown} title="הזז למטה" style={{ border: '1px solid var(--border)', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: 'var(--text)' }}>▼</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn btn-secondary" onClick={onPreview}>👁 תצוגה מקדימה</button>
          <button type="button" className="btn btn-secondary" onClick={onDelete}>מחיקה</button>
          <button type="button" className="btn btn-secondary" onClick={onEdit}>עריכת שאלה</button>
        </div>
      </div>
    );
  }

  return <QuestionForm q={q} quizId={quizId} onChange={onChange} onDone={onSave} doneLabel="✓ שמור שאלה" title={`שאלה ${index + 1}`} />;
}

function QuizBuilder({ onDone, existingQuiz }) {
  const [quizId] = useState(() => existingQuiz?.id || generateId());
  const [title, setTitle] = useState(existingQuiz?.title || '');
  const [coverImageURL, setCoverImageURL] = useState(existingQuiz?.coverImageURL || '');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [questions, setQuestions] = useState(() =>
    existingQuiz?.questions?.length
      ? existingQuiz.questions.map((q) => ({
          ...q, id: generateId(), imageURL: q.imageURL || '', answerImageURL: q.answerImageURL || '',
          answerExplanation: q.answerExplanation || '', saved: true, uploading: false, uploadingAnswer: false,
        }))
      : [emptyQuestion()]
  );
  const [previewIndex, setPreviewIndex] = useState(null);

  function updateQuestion(idx, updated) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? updated : q)));
  }

  function saveQuestion(idx) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, saved: true } : q)));
  }

  function editQuestion(idx) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, saved: false } : q)));
  }

  function deleteQuestion(idx) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function addQuestion() {
    setQuestions((qs) => [...qs, emptyQuestion()]);
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
      questions: questions.map(({ text, options, correctIndex, timeLimit, imageURL, answerImageURL, answerExplanation }) => ({
        text, options, correctIndex, timeLimit, imageURL: imageURL || null, answerImageURL: answerImageURL || null,
        answerExplanation: answerExplanation || null,
      })),
    });
    onDone();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 640 }}>
      <input
        className="input"
        style={{ width: '100%', fontSize: 20, fontWeight: 700 }}
        placeholder="שם החידון"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <div className="card" style={{ padding: 18 }}>
        <input type="file" accept="image/*" id="cover-image" style={{ display: 'none' }} onChange={handleCoverImage} />
        <label htmlFor="cover-image" className="btn btn-secondary" style={{ display: 'inline-block', cursor: 'pointer' }}>
          {uploadingCover ? 'מעלה תמונה...' : coverImageURL ? '🖼️ החלפת תמונה ראשית' : '🖼️ העלאת תמונה ראשית (מסך פתיחה, אופציונלי)'}
        </label>
        <div className="dim" style={{ fontSize: 13, marginTop: 6 }}>תוצג במסך המנחה בזמן שממתינים שהמשחק יתחיל</div>
        {coverImageURL && <img src={coverImageURL} alt="" style={{ display: 'block', marginTop: 10, maxWidth: 300, borderRadius: 10 }} />}
      </div>

      {questions.map((q, idx) => (
        <QuestionEditor
          key={q.id}
          q={q}
          index={idx}
          total={questions.length}
          quizId={quizId}
          onChange={(u) => updateQuestion(idx, u)}
          onSave={() => saveQuestion(idx)}
          onEdit={() => editQuestion(idx)}
          onDelete={() => deleteQuestion(idx)}
          onPreview={() => setPreviewIndex(idx)}
          onMoveUp={() => moveQuestion(idx, -1)}
          onMoveDown={() => moveQuestion(idx, 1)}
        />
      ))}

      <button type="button" className="btn btn-secondary" disabled={!canAddNext} onClick={addQuestion}>
        + הוסף שאלה הבאה
      </button>

      <button type="button" className="btn" disabled={!canSaveQuiz} onClick={saveQuiz} style={{ fontSize: 18 }}>
        💾 {existingQuiz ? 'עדכון חידון' : 'שמירת חידון'} ({savedCount} שאלות)
      </button>

      {previewIndex !== null && (
        <PreviewModal
          questions={questions}
          startIndex={previewIndex}
          quizId={quizId}
          onSaveQuestion={(idx, updated) => updateQuestion(idx, updated)}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

function QuizList({ quizzes, onEdit }) {
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
        quiz: { title: quiz.title, questions: quiz.questions, coverImageURL: quiz.coverImageURL || null },
        status: 'lobby',
        currentIndex: -1,
        questionStartedAt: null,
        showWhoChose: false,
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

  if (!quizzes.length) return <div className="dim">עדיין אין חידונים שמורים.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 640 }}>
      {quizzes.map((q) => (
        <div key={q.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{q.title}</div>
            <div className="dim" style={{ fontSize: 14 }}>{q.questions?.length || 0} שאלות</div>
          </div>
          <button
            type="button"
            className="btn"
            disabled={!q.questions?.length || launching === q.id}
            onClick={() => handleLaunch(q)}
          >
            {launching === q.id ? 'מפעיל...' : '▶ הפעל חידון'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!q.questions?.length}
            onClick={() => setPreviewQuiz(q)}
          >
            🖥️ תצוגה מקדימה למצגת
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(q)}>עריכה / הוספת שאלות</button>
          <button type="button" className="btn btn-secondary" onClick={() => handleDelete(q.id)}>מחיקה</button>
        </div>
      ))}

      {previewQuiz && (
        <PreviewModal
          questions={previewQuiz.questions}
          startIndex={0}
          quizId={previewQuiz.id}
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
      setQuizzes(Object.entries(val).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.createdAt - a.createdAt));
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
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Link to="/" className="dim" style={{ textDecoration: 'none' }}>← חזרה</Link>
        <div className="title" style={{ fontSize: 26 }}>⚙️ ניהול חידונים</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className={`btn ${mode === 'list' ? '' : 'btn-secondary'}`} onClick={() => setMode('list')}>החידונים שלי</button>
        <button className={`btn ${mode === 'builder' ? '' : 'btn-secondary'}`} onClick={startNew}>+ חידון חדש</button>
      </div>

      {mode === 'list' ? (
        <QuizList quizzes={quizzes} onEdit={startEdit} />
      ) : (
        <QuizBuilder key={editingQuiz?.id || 'new'} existingQuiz={editingQuiz} onDone={() => setMode('list')} />
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
