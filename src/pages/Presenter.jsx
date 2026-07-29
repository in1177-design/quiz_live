import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, update, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { db } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import Podium from '../components/Podium.jsx';
import { QuestionCard } from '../components/QuestionDisplay.jsx';
import { EyeIcon, RightSquareIcon } from '../components/icons.jsx';
import { generatePin } from '../utils/ids.js';

function joinUrl(pin) {
  return `${window.location.origin}${window.location.pathname}#/play?pin=${pin}`;
}

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

function Lobby({ pin, session }) {
  const players = Object.entries(session.players || {}).map(([id, p]) => ({ id, ...p }));
  const coverImageURL = session.quiz?.coverImageURL;

  async function startGame() {
    await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: 0, questionStartedAt: Date.now() });
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
      </div>

      <div className="card pop-in" style={{ minWidth: 340, flex: 1, maxWidth: 500, padding: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div className="title" style={{ fontSize: 26 }}>משתתפים ({players.length})</div>
          <button className="btn" onClick={startGame}>▶ התחלת משחק</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
          {players.map((p) => (
            <div key={p.id} className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '8px 16px', fontSize: 18 }}>
              <span style={{ fontSize: 22 }}>{p.avatar?.type === 'photo' ? '📷' : p.avatar?.value}</span>
              <span>{p.name}</span>
            </div>
          ))}
          {players.length === 0 && <div className="dim">אפשר להתחיל גם ללא משתתפים (מצב בדיקה) — ממתין לשחקנים...</div>}
        </div>
      </div>
      </div>
    </>
  );
}

function iconBtnStyle(active, disabled) {
  return {
    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
    background: active ? 'rgba(178,136,255,0.25)' : 'rgba(37,32,68,0.7)',
    border: `1px solid ${active ? 'var(--accent)' : '#3e376e'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
  };
}

function ScreenHeader({ session, revealed, onNext, onEyeClick, eyeTitle, eyeActive }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: 1380, gap: 16 }}>
      <div style={{ fontSize: 14 }}>
        <span style={{ color: '#b288ff', fontWeight: 700 }}>{session.quiz.title}</span>
        <span className="dim"> · שאלה {session.currentIndex + 1} מתוך {session.quiz.questions.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {revealed && (
          <button type="button" onClick={onNext} title="שאלה הבאה" style={iconBtnStyle(false)}>
            <RightSquareIcon size={24} />
          </button>
        )}
        <button type="button" onClick={onEyeClick} title={eyeTitle} style={iconBtnStyle(eyeActive)}>
          <EyeIcon size={24} />
        </button>
      </div>
    </div>
  );
}

function QuestionScreen({ session, onTimeUp }) {
  const q = session.quiz.questions[session.currentIndex];
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit);
  const firedRef = useRef(false);
  const answers = session.answers?.[session.currentIndex] || {};
  const players = session.players || {};
  const answeredCount = Object.keys(answers).length;
  const totalPlayers = Object.keys(players).length;
  const voters = [0, 1, 2, 3].map((oi) => Object.entries(answers).filter(([, a]) => a.optionIndex === oi).map(([pid]) => players[pid]));

  useEffect(() => {
    firedRef.current = false;
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
  }, [session.currentIndex, session.questionStartedAt]);

  function skipToAnswers() {
    if (!firedRef.current) { firedRef.current = true; onTimeUp(); }
  }

  return (
    <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <ScreenHeader session={session} revealed={false} onEyeClick={skipToAnswers} eyeTitle="דלג לתשובות" />
      <QuestionCard
        q={q}
        revealed={false}
        secondsLeft={secondsLeft}
        voters={voters}
        showWho={session.showWhoChose}
        meta={<div className="dim" style={{ fontSize: 14 }}>{answeredCount} / {totalPlayers} ענו</div>}
      />
    </div>
  );
}

function RevealScreen({ pin, session, onNext }) {
  const q = session.quiz.questions[session.currentIndex];
  const answers = session.answers?.[session.currentIndex] || {};
  const players = session.players || {};
  const voters = [0, 1, 2, 3].map((oi) => Object.entries(answers).filter(([, a]) => a.optionIndex === oi).map(([pid]) => players[pid]));

  async function toggleShowWho() {
    await update(ref(db, `sessions/${pin}`), { showWhoChose: !session.showWhoChose });
  }

  return (
    <div style={{ width: '100%', maxWidth: 1380, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <ScreenHeader
        session={session}
        revealed={true}
        onNext={onNext}
        onEyeClick={toggleShowWho}
        eyeTitle={session.showWhoChose ? 'הסתר מי בחר מה' : 'הצג מי בחר מה'}
        eyeActive={session.showWhoChose}
      />
      <QuestionCard q={q} revealed={true} voters={voters} showWho={session.showWhoChose} />
    </div>
  );
}

function FinalScreen({ session, onRestart }) {
  const players = Object.values(session.players || {}).sort((a, b) => b.score - a.score);
  const top3 = players.slice(0, 3);
  const rest = players.slice(3, 10);

  return (
    <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, flex: 1, justifyContent: 'center' }}>
      <div className="title" style={{ fontSize: 44 }}>🏆 התוצאות הסופיות</div>
      <Podium top3={top3} />
      {rest.length > 0 && (
        <div className="card" style={{ width: '100%' }}>
          {rest.map((p, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span>{i + 4}. {p.avatar?.type === 'photo' ? '📷' : p.avatar?.value} {p.name}</span>
              <span style={{ fontWeight: 700 }}>{p.score}</span>
            </div>
          ))}
        </div>
      )}
      <button className="btn" onClick={onRestart}>🔁 משחק חדש</button>
    </div>
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

  async function goToReveal() {
    await update(ref(db, `sessions/${pin}`), { status: 'reveal' });
  }

  async function nextQuestion() {
    const nextIndex = session.currentIndex + 1;
    if (nextIndex < session.quiz.questions.length) {
      await update(ref(db, `sessions/${pin}`), { status: 'question', currentIndex: nextIndex, questionStartedAt: Date.now() });
    } else {
      await update(ref(db, `sessions/${pin}`), { status: 'final' });
    }
  }

  const isLiveScreen = pin && session && (session.status === 'question' || session.status === 'reveal');

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
      {pin && session && session.status === 'question' && <QuestionScreen session={session} onTimeUp={goToReveal} />}
      {pin && session && session.status === 'reveal' && <RevealScreen pin={pin} session={session} onNext={nextQuestion} />}
      {pin && session && session.status === 'final' && <FinalScreen session={session} onRestart={() => setPin(null)} />}
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
