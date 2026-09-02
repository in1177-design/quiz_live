import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, onValue, set, update } from 'firebase/database';
import { db } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import { generateUniqueSessionCode, joinUrl } from '../utils/ids.js';
import { DISPLAY_LANGUAGES } from '../utils/languages.js';

function presentUrl(pin) {
  return `${window.location.origin}${window.location.pathname}#/present?pin=${pin}`;
}

function QuizPicker({ onStart }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState('');
  const [starting, setStarting] = useState(false);
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);

  // Closes the dropdown on any click outside it. A position:fixed overlay doesn't work here
  // because the card's pop-in animation gives it a transform, which makes it the containing
  // block for fixed-position children instead of the viewport — so a document listener is used.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  useEffect(() => {
    return onValue(ref(db, 'quizzes'), (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
      setQuizzes(list);
      setSelected((s) => s || (list[0]?.id ?? ''));
    });
  }, []);

  const selectedQuiz = quizzes.find((q) => q.id === selected);

  async function handleStart() {
    const quiz = quizzes.find((q) => q.id === selected);
    if (!quiz) return;
    setStarting(true);
    try {
      let pin = quiz.joinCode;
      if (!pin) {
        pin = await generateUniqueSessionCode();
        await update(ref(db, `quizzes/${quiz.id}`), { joinCode: pin });
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
      onStart(pin);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="card pop-in" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
      <div className="title" style={{ fontSize: 24, marginBottom: 20 }}>🎮 שלט מנחה</div>
      {quizzes.length === 0 ? (
        <div className="dim">אין חידונים עדיין — צרו אחד בעמוד הניהול.</div>
      ) : (
        <>
          <div ref={pickerRef} style={{ position: 'relative', marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="input"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'right' }}
            >
              <span>
                {selectedQuiz?.title}
                <span className="dim" style={{ fontSize: 13, marginRight: 6 }}>({selectedQuiz?.questions?.length || 0} שאלות)</span>
              </span>
              <span style={{ display: 'inline-block', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {open && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 10, maxHeight: 260, overflowY: 'auto',
                  background: '#211c44', border: '1px solid #3e376e', borderRadius: 12, boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                }}>
                  {quizzes.map((q) => (
                    <div
                      key={q.id}
                      onClick={() => { setSelected(q.id); setOpen(false); }}
                      style={{
                        padding: '12px 16px', cursor: 'pointer', textAlign: 'right',
                        background: q.id === selected ? 'rgba(178,136,255,0.18)' : 'transparent',
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>{q.title}</div>
                      <div className="dim" style={{ fontSize: 12 }}>{q.questions?.length || 0} שאלות</div>
                    </div>
                  ))}
                </div>
            )}
          </div>
          <button className="btn" style={{ width: '100%' }} disabled={starting} onClick={handleStart}>
            {starting ? 'יוצר משחק...' : '🚀 הפעלת חידון'}
          </button>
        </>
      )}
    </div>
  );
}

function bigButtonStyle(background) {
  return {
    width: '100%', padding: '22px 16px', fontSize: 20, fontWeight: 800, borderRadius: 18,
    border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', background,
  };
}

function toggleBtnStyle(active) {
  return {
    border: 'none', padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--surface-strong)', color: active ? 'white' : 'var(--dim)',
  };
}

function controlBtnStyle(background) {
  return {
    border: 'none', borderRadius: 12, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    background, color: 'white', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, whiteSpace: 'nowrap',
  };
}

const STATUS_LABEL = {
  lobby: 'לובי — ממתינים להתחלה',
  question: 'שאלה חיה',
  reveal: 'מסך תשובה',
  slide: 'סלייד',
  final: 'תוצאות סופיות',
  closing: 'שקף סיום',
};

function RemoteControls({ pin, session, onExit }) {
  const [copied, setCopied] = useState(null); // 'play' | 'present' | null
  const status = session.status;
  const isLiveItem = status === 'question' || status === 'reveal' || status === 'slide';
  const q = isLiveItem ? session.quiz.questions[session.currentIndex] : null;
  const isSlide = q?.type === 'slide';
  const manualTimer = !!session.quiz.manualTimer;
  const [secondsLeft, setSecondsLeft] = useState(null);

  // Lets you read the question out loud in either language when the quiz has a second display
  // language configured — independent of what the big screen currently shows.
  const secondLang = session.quiz.displayLanguage && session.quiz.displayLanguage !== 'he' ? session.quiz.displayLanguage : null;
  const [readLang, setReadLang] = useState('he');
  const readTranslated = readLang !== 'he' && secondLang;
  const displayQ = q && readTranslated && !isSlide
    ? {
        text: q.textTranslated || q.text, options: q.options.map((o, i) => q.optionsTranslated?.[i] || o),
        answerExplanation: q.answerExplanationTranslated || q.answerExplanation,
      }
    : q;

  useEffect(() => {
    if (status !== 'question' || manualTimer || !q || !session.questionStartedAt) { setSecondsLeft(null); return; }
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil(q.timeLimit - (Date.now() - session.questionStartedAt) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session.questionStartedAt, session.currentIndex, manualTimer]);

  const answers = session.answers?.[session.currentIndex] || {};
  const answeredCount = Object.keys(answers).length;
  const playerCount = Object.keys(session.players || {}).length;
  const voteCounts = q && !isSlide
    ? q.options.map((_, i) => Object.values(answers).filter((a) => a.optionIndex === i).length)
    : [];

  async function startGame() {
    const firstItem = session.quiz.questions[0];
    if (firstItem?.type === 'slide') {
      await update(ref(db, `sessions/${pin}`), { status: 'slide', currentIndex: 0, questionStartedAt: null });
    } else {
      await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: 0, questionStartedAt: Date.now() });
    }
  }

  async function skipToAnswers() {
    await update(ref(db, `sessions/${pin}`), { status: 'reveal' });
  }

  async function nextItem() {
    const nextIndex = session.currentIndex + 1;
    if (nextIndex < session.quiz.questions.length) {
      const next = session.quiz.questions[nextIndex];
      if (next.type === 'slide') {
        await update(ref(db, `sessions/${pin}`), { status: 'slide', currentIndex: nextIndex, questionStartedAt: null });
      } else {
        await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: nextIndex, questionStartedAt: Date.now() });
      }
    } else {
      await update(ref(db, `sessions/${pin}`), { status: 'final' });
    }
  }

  async function goToClosing() {
    await update(ref(db, `sessions/${pin}`), { status: 'closing' });
  }

  // Pausing shows the quiz's cover image on the big screen and a "we'll be back" message on
  // players' phones. A question's countdown is frozen (not just hidden) — resuming shifts
  // questionStartedAt forward by however long the pause lasted, so no time is lost.
  async function pauseGame() {
    const updates = { pausedFromStatus: session.status, status: 'paused' };
    if (session.status === 'question') updates.pausedAt = Date.now();
    await update(ref(db, `sessions/${pin}`), updates);
  }

  async function resumeGame() {
    const updates = { status: session.pausedFromStatus || 'lobby', pausedFromStatus: null, pausedAt: null };
    if (session.pausedFromStatus === 'question' && session.pausedAt && session.questionStartedAt) {
      updates.questionStartedAt = session.questionStartedAt + (Date.now() - session.pausedAt);
    }
    await update(ref(db, `sessions/${pin}`), updates);
  }

  // Resets the whole game back to the lobby — clears all submitted answers and everyone's
  // score, but keeps players joined so they don't need to rescan/rejoin.
  async function restartGame() {
    if (!window.confirm('לאפס את החידון ולהתחיל מחדש? כל הניקוד יימחק.')) return;
    const resetPlayers = Object.fromEntries(
      Object.entries(session.players || {}).map(([id, p]) => [id, { ...p, score: 0 }])
    );
    await update(ref(db, `sessions/${pin}`), {
      status: 'lobby', currentIndex: -1, questionStartedAt: null, answers: {},
      pausedFromStatus: null, pausedAt: null, players: resetPlayers,
    });
  }

  async function copy(kind, url) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  if (status === 'paused') {
    return (
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⏸️</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>המשחק בהפסקה</div>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>מסך התצוגה מציג את התמונה הראשית</div>
        </div>
        <button type="button" style={bigButtonStyle('linear-gradient(135deg, var(--accent), #22d3ee)')} onClick={resumeGame}>
          ▶ חזרה לחידון
        </button>
        <span onClick={onExit} style={{ fontSize: 12, color: 'var(--dim)', cursor: 'pointer', textDecoration: 'underline', textAlign: 'center' }}>
          🔁 בחירת חידון אחר
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span onClick={onExit} style={{ fontSize: 12, color: 'var(--dim)', cursor: 'pointer', textDecoration: 'underline' }}>
          🔁 בחירת חידון אחר
        </span>
        <span
          onClick={() => copy('present', presentUrl(pin))}
          style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {copied === 'present' ? '✓ הועתק' : '🖥️ העתק קישור למסך תצוגה'}
        </span>
        <span
          onClick={() => copy('play', joinUrl(pin))}
          style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
        >
          {copied === 'play' ? '✓ הועתק' : '📱 העתק קישור לשחקנים'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isLiveItem && secondLang && (
          <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
            <button type="button" onClick={() => setReadLang('he')} style={toggleBtnStyle(readLang === 'he')}>עברית</button>
            <button type="button" onClick={() => setReadLang(secondLang)} style={toggleBtnStyle(readLang === secondLang)}>
              {DISPLAY_LANGUAGES[secondLang]?.label}
            </button>
          </div>
        )}
        <button type="button" onClick={restartGame} style={controlBtnStyle('#f59e0b')}>🔄 התחל מחדש</button>
        <button type="button" onClick={pauseGame} style={controlBtnStyle('#ef4444')}>⏸ עצור</button>
      </div>

      {isLiveItem ? (
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, fontSize: 19 }}>
            {isSlide ? 'סלייד' : 'שאלה'} {session.currentIndex + 1} מתוך {session.quiz.questions.length}
          </div>
          {!isSlide && (
            <div className="dim" style={{ fontSize: 12, marginTop: 3 }}>
              {!manualTimer && secondsLeft !== null && `⏱ ${secondsLeft} שניות · `}
              {answeredCount}/{playerCount} ענו
            </div>
          )}
        </div>
      ) : status === 'lobby' ? (
        <div className="card" style={{ padding: '14px 18px', textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{STATUS_LABEL.lobby}</div>
          <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>
            {playerCount === 0 ? 'עדיין לא הצטרפו שחקנים' : Object.values(session.players).map((p) => p.name).join(', ')}
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: '14px 18px', textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {STATUS_LABEL[status] || status}{playerCount ? ` · ${playerCount} שחקנים` : ''}
          </div>
        </div>
      )}

      {status === 'lobby' && (
        <button type="button" style={bigButtonStyle('linear-gradient(135deg, var(--accent), #22d3ee)')} onClick={startGame}>
          🚀 התחלת המשחק
        </button>
      )}

      {isLiveItem && displayQ && !isSlide && (
        <div className="card" style={{ padding: 18, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 16, direction: readTranslated ? 'ltr' : 'rtl', textAlign: readTranslated ? 'left' : 'right' }}>
            {displayQ.text || '(אין טקסט שאלה)'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {displayQ.options.map((opt, i) => {
              const isCorrect = i === q.correctIndex;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 700, color: `var(--opt-${i})`, flexShrink: 0 }}>{i + 1}.</span>
                  <span
                    style={{
                      fontWeight: isCorrect ? 800 : 400, color: isCorrect ? `var(--opt-${i})` : 'inherit', flex: 1,
                      direction: readTranslated ? 'ltr' : 'rtl', textAlign: readTranslated ? 'left' : 'right',
                    }}
                  >
                    {opt || `תשובה ${i + 1}`}
                  </span>
                  {isCorrect && <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>}
                  <span className="dim" style={{ fontSize: 12, flexShrink: 0, minWidth: 16, textAlign: 'center' }}>{voteCounts[i]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLiveItem && displayQ && !isSlide && displayQ.answerExplanation && (
        <div className="card" style={{ padding: 16, textAlign: 'center', color: '#f59e0b', fontWeight: 700, fontSize: 14, direction: readTranslated ? 'ltr' : 'rtl' }}>
          {displayQ.answerExplanation}
        </div>
      )}
      {isLiveItem && isSlide && <div className="dim" style={{ textAlign: 'center' }}>סלייד תמונה (בלי טקסט)</div>}

      {status === 'question' && (
        <button type="button" style={bigButtonStyle('var(--opt-0)')} onClick={skipToAnswers}>
          ⏭ מעבר לתשובה
        </button>
      )}

      {(status === 'reveal' || status === 'slide') && (
        <button type="button" style={bigButtonStyle('linear-gradient(135deg, var(--accent), #22d3ee)')} onClick={nextItem}>
          ➡ {status === 'slide' ? 'המשך' : 'שאלה הבאה'}
        </button>
      )}

      {status === 'final' && (
        <>
          {session.quiz.closingSlide?.imageURL && (
            <button type="button" style={bigButtonStyle('linear-gradient(135deg, var(--accent), #22d3ee)')} onClick={goToClosing}>
              ➡ המשך לשקף סיום
            </button>
          )}
          <button type="button" style={bigButtonStyle('#8b5cf6')} onClick={onExit}>
            🔁 משחק חדש
          </button>
        </>
      )}

      {status === 'closing' && (
        <button type="button" style={bigButtonStyle('#8b5cf6')} onClick={onExit}>
          🔁 משחק חדש
        </button>
      )}
    </div>
  );
}

function RemoteInner() {
  const [pin, setPinState] = useState(() => localStorage.getItem('quiz_presenter_pin') || null);
  const [session, setSession] = useState(null);

  function setPin(newPin) {
    if (newPin) localStorage.setItem('quiz_presenter_pin', newPin);
    else localStorage.removeItem('quiz_presenter_pin');
    setPinState(newPin);
  }

  useEffect(() => {
    if (!pin) return;
    return onValue(ref(db, `sessions/${pin}`), (snap) => {
      if (!snap.exists()) { setPin(null); setSession(null); return; }
      setSession(snap.val());
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <div className="screen">
      <div style={{
        width: '100%', maxWidth: 480, background: '#1a1531', border: '1px solid #342e5b', borderRadius: 16,
        padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>🎮 שלט מנחה</span>
          {session?.quiz?.title && <span className="dim" style={{ fontWeight: 700, fontSize: 16 }}>{session.quiz.title}</span>}
        </div>
        <Link to="/" className="dim" style={{ textDecoration: 'none', fontSize: 14 }}>חזרה →</Link>
      </div>

      {!pin && <QuizPicker onStart={setPin} />}
      {pin && session && <RemoteControls pin={pin} session={session} onExit={() => setPin(null)} />}
      {pin && !session && <div className="dim">טוען...</div>}
    </div>
  );
}

export default function Remote() {
  return (
    <PasswordGate label="כניסת מנחה">
      <RemoteInner />
    </PasswordGate>
  );
}
