import { useEffect, useRef, useState } from 'react';
import { ref, onValue, set, update, get } from 'firebase/database';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { db } from '../firebase.js';
import PasswordGate from '../components/PasswordGate.jsx';
import Timer from '../components/Timer.jsx';
import BarChart from '../components/BarChart.jsx';
import Podium from '../components/Podium.jsx';
import { generatePin } from '../utils/ids.js';

const REVEAL_SECONDS = 5;

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

function QuestionScreen({ pin, session, onTimeUp }) {
  const q = session.quiz.questions[session.currentIndex];
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit);
  const firedRef = useRef(false);
  const answers = session.answers?.[session.currentIndex] || {};
  const counts = [0, 0, 0, 0];
  Object.values(answers).forEach((a) => { if (a.optionIndex >= 0 && a.optionIndex < 4) counts[a.optionIndex]++; });
  const players = session.players || {};
  const answeredCount = Object.keys(answers).length;
  const totalPlayers = Object.keys(players).length;

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

  async function toggleShowWho() {
    await update(ref(db, `sessions/${pin}`), { showWhoChose: !session.showWhoChose });
  }

  async function endNow() {
    if (!firedRef.current) { firedRef.current = true; onTimeUp(); }
  }

  const voters = session.showWhoChose
    ? [0, 1, 2, 3].map((oi) => Object.entries(answers).filter(([, a]) => a.optionIndex === oi).map(([pid]) => players[pid]))
    : undefined;

  return (
    <div style={{ width: '100%', maxWidth: 1400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <div className="dim" style={{ fontSize: 18 }}>שאלה {session.currentIndex + 1} מתוך {session.quiz.questions.length}</div>
      <div className="card pop-in" style={{ width: '100%', textAlign: 'center', padding: 48, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Timer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} size={120} />
        </div>
        <div className="title" style={{ fontSize: 44, marginBottom: 20 }}>{q.text}</div>
        {q.imageURL && <img src={q.imageURL} alt="" style={{ maxWidth: '100%', maxHeight: '48vh', borderRadius: 20, marginBottom: 20, alignSelf: 'center' }} />}
        <div className="dim" style={{ marginBottom: 20, fontSize: 18 }}>{answeredCount} / {totalPlayers} ענו</div>
        <BarChart counts={counts} options={q.options} revealed={false} voters={voters} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn btn-secondary" onClick={toggleShowWho}>
          {session.showWhoChose ? 'הסתר מי בחר מה' : '👀 הצג מי בחר מה'}
        </button>
        <button className="btn" onClick={endNow}>⏭ סיום שאלה עכשיו</button>
      </div>
    </div>
  );
}

function RevealScreen({ pin, session, onNext }) {
  const q = session.quiz.questions[session.currentIndex];
  const [countdown, setCountdown] = useState(REVEAL_SECONDS);
  const answers = session.answers?.[session.currentIndex] || {};
  const players = session.players || {};
  const counts = [0, 0, 0, 0];
  Object.values(answers).forEach((a) => { if (a.optionIndex >= 0 && a.optionIndex < 4) counts[a.optionIndex]++; });
  const voters = [0, 1, 2, 3].map((oi) => Object.entries(answers).filter(([, a]) => a.optionIndex === oi).map(([pid]) => players[pid]));

  useEffect(() => {
    setCountdown(REVEAL_SECONDS);
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [session.currentIndex]);

  const isLast = session.currentIndex === session.quiz.questions.length - 1;
  const displayImage = q.answerImageURL || q.imageURL;

  return (
    <div style={{ width: '100%', maxWidth: 1400, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, flex: 1 }}>
      <div className="card pop-in" style={{ width: '100%', textAlign: 'center', padding: 48, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 400, marginBottom: 16, color: 'var(--text-dim)' }}>{q.text}</div>
        {displayImage && <img src={displayImage} alt="" style={{ maxWidth: '100%', maxHeight: '48vh', borderRadius: 20, marginBottom: 20, alignSelf: 'center' }} />}
        {q.answerExplanation && <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 20 }}>{q.answerExplanation}</div>}
        <div style={{ fontSize: 20, fontWeight: 500, color: 'var(--opt-' + q.correctIndex + ')', marginBottom: 20 }}>
          ✅ {q.options[q.correctIndex]}
        </div>
        <BarChart counts={counts} options={q.options} correctIndex={q.correctIndex} revealed={true} voters={voters} />
      </div>
      <button className="btn" disabled={countdown > 0} onClick={onNext} style={{ fontSize: 20, padding: '16px 36px' }}>
        {countdown > 0 ? `הבא בעוד ${countdown}...` : isLast ? '🏆 הצגת תוצאות סופיות' : 'שאלה הבאה →'}
      </button>
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

  return (
    <div className="screen">
      <div style={{ width: '100%', maxWidth: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Link to="/" className="dim" style={{ textDecoration: 'none' }}>← חזרה</Link>
        {session?.quiz && <div className="dim">{session.quiz.title}</div>}
        <div style={{ width: 60 }} />
      </div>

      {!pin && <QuizSelect onStart={setPin} />}
      {pin && session && session.status === 'lobby' && <Lobby pin={pin} session={session} />}
      {pin && session && session.status === 'question' && <QuestionScreen pin={pin} session={session} onTimeUp={goToReveal} />}
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
