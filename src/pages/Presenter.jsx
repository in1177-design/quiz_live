import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, update } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import Podium from '../components/Podium.jsx';
import { QuestionCard, FullBackgroundQuestionCard } from '../components/QuestionDisplay.jsx';
import { EyeIcon, RightSquareIcon, ShareIcon, SettingsIcon, ImageIcon } from '../components/icons.jsx';
import { generateUniqueSessionCode, joinUrl } from '../utils/ids.js';

function QuizSelect({ onStart }) {
  const [quizzes, setQuizzes] = useState([]);
  const [selected, setSelected] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    return onValue(ref(db, 'quizzes'), (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val).map(([id, v]) => ({ id, ...v }));
      setQuizzes(list);
      if (!selected && list.length) setSelected(list[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStart() {
    const quiz = quizzes.find((q) => q.id === selected);
    if (!quiz) return;
    setStarting(true);
    let pin = quiz.joinCode;
    if (!pin) {
      pin = await generateUniqueSessionCode();
      await update(ref(db, `quizzes/${quiz.id}`), { joinCode: pin });
    }
    await set(ref(db, `sessions/${pin}`), {
      quizId: quiz.id,
      quiz: {
        title: quiz.title, questions: quiz.questions, coverImageURL: quiz.coverImageURL || null,
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
  }

  return (
    <div className="card pop-in" style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
      <div className="title" style={{ fontSize: 26, marginBottom: 20 }}>🖥️ מסך מנחה</div>
      {quizzes.length === 0 ? (
        <div className="dim">אין חידונים עדיין — צרו אחד בעמוד הניהול.</div>
      ) : (
        <>
          <select className="input" style={{ width: '100%', marginBottom: 16 }} value={selected} onChange={(e) => setSelected(e.target.value)}>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>{q.title} ({q.questions?.length || 0} שאלות)</option>
            ))}
          </select>
          <button className="btn" style={{ width: '100%' }} disabled={starting} onClick={handleStart}>
            {starting ? 'יוצר משחק...' : '🚀 Start Game'}
          </button>
        </>
      )}
    </div>
  );
}

function JoinLink({ pin }) {
  const [copied, setCopied] = useState(false);
  const url = joinUrl(pin);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function shareLink() {
    if (navigator.share) {
      try { await navigator.share({ title: 'הצטרפות לחידון', url }); } catch (err) { /* user cancelled or unsupported */ }
    } else {
      copyLink();
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' }}>
      <button
        type="button"
        onClick={copyLink}
        title="העתקת קישור"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--accent)', fontSize: 14, textDecoration: 'underline', direction: 'ltr' }}
      >
        {copied ? 'הקישור הועתק ✓' : url}
      </button>
      <button
        type="button"
        onClick={shareLink}
        title="שליחת קישור"
        style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text)' }}
      >
        <ShareIcon size={16} />
      </button>
    </div>
  );
}

function Lobby({ pin, session }) {
  const players = Object.entries(session.players || {}).map(([id, p]) => ({ id, ...p }));
  const coverImageURL = session.quiz?.coverImageURL;

  async function startGame() {
    const firstItem = session.quiz.questions[0];
    if (firstItem?.type === 'slide') {
      await update(ref(db, `sessions/${pin}`), { status: 'slide', currentIndex: 0, questionStartedAt: null });
    } else {
      await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: 0, questionStartedAt: Date.now() });
    }
  }

  return (
    <>
      {coverImageURL && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 0,
            backgroundImage: `linear-gradient(rgba(15,12,41,0.55), rgba(15,12,41,0.85)), url(${coverImageURL})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}
        />
      )}
      <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 1200, flex: 1, position: 'relative', zIndex: 1 }}>
        <div className="card pop-in" style={{ textAlign: 'center', padding: 40 }}>
        <div className="dim" style={{ marginBottom: 12, fontSize: 18 }}>סרקו כדי להצטרף</div>
        <div style={{ background: 'white', padding: 20, borderRadius: 20, display: 'inline-block' }}>
          <QRCodeSVG value={joinUrl(pin)} size={260} />
        </div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 6, margin: '22px 0 6px' }}>{pin}</div>
        <div className="dim" style={{ fontSize: 18 }}>קוד הצטרפות</div>
        <JoinLink pin={pin} />
      </div>

      <div className="card pop-in" style={{ minWidth: 340, flex: 1, maxWidth: 500, padding: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="title" style={{ fontSize: 26 }}>משתתפים ({players.length})</div>
          <button className="btn" onClick={startGame}>▶ התחלת משחק</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {players.map((p) => (
            <div key={p.id} className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '8px 16px', fontSize: 18 }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                {p.avatar?.type === 'photo'
                  ? <img src={p.avatar.value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p.avatar?.value}
              </span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </>
  );
}

function CornerIconButton({ onClick, title, disabled, style, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 44, height: 44, borderRadius: 12, border: '1px solid #3e376e',
        background: 'rgba(37,32,68,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.15 : (hover ? 1 : 0.3), transition: 'opacity 0.2s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function CornerActionButtons({ onEyeClick, eyeTitle, eyeEnabled, onNext, nextEnabled }) {
  return (
    <>
      <CornerIconButton onClick={onEyeClick} title={eyeTitle} disabled={!eyeEnabled} style={{ position: 'fixed', bottom: 78, right: 20, zIndex: 50 }}>
        <EyeIcon size={22} />
      </CornerIconButton>
      <CornerIconButton onClick={onNext} title="שאלה הבאה" disabled={!nextEnabled} style={{ position: 'fixed', bottom: 20, right: 74, zIndex: 50 }}>
        <RightSquareIcon size={22} />
      </CornerIconButton>
    </>
  );
}

function LiveQuestionScreen({ pin, session, onTimeUp, onNext }) {
  const revealed = session.status === 'reveal';
  const q = session.quiz.questions[session.currentIndex];
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit);
  const firedRef = useRef(false);
  const answers = session.answers?.[session.currentIndex] || {};
  const players = session.players || {};
  const voters = [0, 1, 2, 3].map((oi) => Object.entries(answers).filter(([, a]) => a.optionIndex === oi).map(([pid]) => players[pid]));
  const hasImage = !!(q.imageURL || q.answerImageURL || session.quiz.coverImageURL);
  const fullBackground = session.quiz.questionLayout === 'full' && hasImage;
  const manualTimer = !!session.quiz.manualTimer;
  // The presenter/projector screen shows the quiz's chosen display language when set; players'
  // phones always show the original Hebrew, regardless of this setting (see Player.jsx).
  const ltr = !!session.quiz.displayLanguage && session.quiz.displayLanguage !== 'he';
  const displayQ = ltr
    ? {
        ...q,
        text: q.textTranslated || q.text,
        options: q.options.map((o, i) => q.optionsTranslated?.[i] || o),
        answerExplanation: q.answerExplanationTranslated || q.answerExplanation,
      }
    : q;

  useEffect(() => {
    firedRef.current = false;
    if (session.status !== 'question' || manualTimer) return;
    const started = session.questionStartedAt;
    const tick = () => {
      const left = Math.max(0, q.timeLimit - (Date.now() - started) / 1000);
      setSecondsLeft(left);
      if (left <= 0 && !firedRef.current) {
        firedRef.current = true;
        onTimeUp();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.currentIndex, session.questionStartedAt, session.status, manualTimer]);

  function skipToAnswers() {
    if (!firedRef.current) { firedRef.current = true; onTimeUp(); }
  }

  const headerLabel = `${session.quiz.title} · שאלה ${session.currentIndex + 1} מתוך ${session.quiz.questions.length}`;

  if (fullBackground) {
    return (
      <>
        <FullBackgroundQuestionCard q={displayQ} revealed={revealed} secondsLeft={secondsLeft} voters={voters} coverImageURL={session.quiz.coverImageURL} headerLabel={headerLabel} manualTimer={manualTimer} ltr={ltr} />
        <CornerActionButtons onEyeClick={skipToAnswers} eyeTitle="דלג לתשובות" eyeEnabled={!revealed} onNext={onNext} nextEnabled={revealed} />
      </>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <QuestionCard
        q={displayQ}
        revealed={revealed}
        secondsLeft={secondsLeft}
        voters={voters}
        coverImageURL={session.quiz.coverImageURL}
        headerLabel={headerLabel}
        manualTimer={manualTimer}
        ltr={ltr}
      />
      <CornerActionButtons
        onEyeClick={skipToAnswers}
        eyeTitle="דלג לתשובות"
        eyeEnabled={!revealed}
        onNext={onNext}
        nextEnabled={revealed}
      />
    </div>
  );
}

function LiveSlideScreen({ item, onNext, showControls = true, coverImageURL }) {
  const src = item?.imageURL || coverImageURL;
  const image = src ? (
    <img src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={64} /></div>
  );

  if (item?.imageSize === 'full') {
    return (
      <>
        <div style={{ position: 'fixed', inset: 0, background: '#000' }}>{image}</div>
        {showControls && <CornerActionButtons onEyeClick={undefined} eyeTitle="" eyeEnabled={false} onNext={onNext} nextEnabled />}
      </>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <div className="card pop-in" style={{ width: '100%', padding: 40, display: 'flex', justifyContent: 'center' }}>
        <div style={{
          position: 'relative', width: '100%', maxWidth: 1240, aspectRatio: '1240 / 800', borderRadius: 20,
          border: '1.5px solid #342e5b', overflow: 'hidden', background: 'var(--surface-strong)',
        }}>
          {image}
        </div>
      </div>
      {showControls && <CornerActionButtons onEyeClick={undefined} eyeTitle="" eyeEnabled={false} onNext={onNext} nextEnabled />}
    </div>
  );
}

function FinalScreen({ session, onRestart, onNext }) {
  const players = Object.values(session.players || {}).sort((a, b) => b.score - a.score);
  const top3 = players.slice(0, 3);
  const rest = players.slice(3, 10);

  return (
    <div style={{ width: '100%', maxWidth: 980, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
      <div className="title" style={{ fontSize: 44 }}>🏆 התוצאות הסופיות</div>
      <Podium top3={top3} />
      {rest.length > 0 && (
        <div className="card" style={{ width: '100%' }}>
          {rest.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {i + 4}.
                <span style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.avatar?.type === 'photo'
                    ? <img src={p.avatar.value} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : p.avatar?.value}
                </span>
                {p.name}
              </span>
              <span style={{ fontWeight: 700 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn" onClick={onRestart}>🔁 משחק חדש</button>
        {onNext && <button className="btn btn-secondary" onClick={onNext}>המשך ➡️</button>}
      </div>
    </div>
  );
}

function AdminCornerLink() {
  const navigate = useNavigate();
  return (
    <CornerIconButton onClick={() => navigate('/admin')} title="ניהול חידונים" style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 50 }}>
      <SettingsIcon size={22} />
    </CornerIconButton>
  );
}

function PresenterInner() {
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

  useEffect(() => {
    session?.quiz?.questions?.forEach((q) => {
      if (q.imageURL) new Image().src = q.imageURL;
      if (q.answerImageURL) new Image().src = q.answerImageURL;
    });
    if (session?.quiz?.closingSlide?.imageURL) new Image().src = session.quiz.closingSlide.imageURL;
  }, [session?.quiz?.questions, session?.quiz?.closingSlide]);

  async function goToReveal() {
    await update(ref(db, `sessions/${pin}`), { status: 'reveal' });
  }

  async function goToClosing() {
    await update(ref(db, `sessions/${pin}`), { status: 'closing' });
  }

  async function nextQuestion() {
    const nextIndex = session.currentIndex + 1;
    if (nextIndex < session.quiz.questions.length) {
      const nextItem = session.quiz.questions[nextIndex];
      if (nextItem.type === 'slide') {
        await update(ref(db, `sessions/${pin}`), { status: 'slide', currentIndex: nextIndex, questionStartedAt: null });
      } else {
        await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: nextIndex, questionStartedAt: Date.now() });
      }
    } else {
      await update(ref(db, `sessions/${pin}`), { status: 'final' });
    }
  }

  const isLiveScreen = pin && session && (session.status === 'question' || session.status === 'reveal' || session.status === 'slide');

  return (
    <div className="screen">
      {!isLiveScreen && (
        <div style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Link to="/" className="dim" style={{ textDecoration: 'none' }}>← חזרה</Link>
          {session?.quiz && <div className="dim">{session.quiz.title}</div>}
          <div style={{ width: 60 }} />
        </div>
      )}

      {!pin && <QuizSelect onStart={setPin} />}
      {pin && session && session.status === 'lobby' && <Lobby pin={pin} session={session} />}
      {isLiveScreen && session.status === 'slide' && <LiveSlideScreen item={session.quiz.questions[session.currentIndex]} onNext={nextQuestion} coverImageURL={session.quiz.coverImageURL} />}
      {isLiveScreen && session.status !== 'slide' && <LiveQuestionScreen pin={pin} session={session} onTimeUp={goToReveal} onNext={nextQuestion} />}
      {pin && session && session.status === 'final' && (
        <FinalScreen session={session} onRestart={() => setPin(null)} onNext={session.quiz.closingSlide?.imageURL ? goToClosing : undefined} />
      )}
      {pin && session && session.status === 'closing' && <LiveSlideScreen item={session.quiz.closingSlide} showControls={false} coverImageURL={session.quiz.coverImageURL} />}
      <AdminCornerLink />
    </div>
  );
}

export default function Presenter() {
  return (
    <PasswordGate label="כניסת מנחה">
      <PresenterInner />
    </PasswordGate>
  );
}
