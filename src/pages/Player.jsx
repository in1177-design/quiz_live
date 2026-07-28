import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ref, onValue, set, get, update } from 'firebase/database';
import { db } from '../firebase.js';
import AvatarPicker from '../components/AvatarPicker.jsx';
import Timer from '../components/Timer.jsx';
import { generateId } from '../utils/ids.js';
import { calcPoints } from '../utils/scoring.js';

const OPTION_STYLES = [
  { color: 'var(--opt-0)', shape: '▲' },
  { color: 'var(--opt-1)', shape: '◆' },
  { color: 'var(--opt-2)', shape: '●' },
  { color: 'var(--opt-3)', shape: '■' },
];

function JoinScreen({ initialPin, onJoined }) {
  const [pin, setPin] = useState(initialPin || '');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState({ type: 'emoji', value: '🦊' });
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    if (!pin.trim() || !name.trim()) return;
    setJoining(true);
    try {
      const snap = await get(ref(db, `sessions/${pin.trim()}`));
      if (!snap.exists()) {
        setError('קוד לא נמצא, בדקו שוב');
        return;
      }
      const session = snap.val();
      if (session.status !== 'lobby') {
        setError('המשחק כבר התחיל, אי אפשר להצטרף כרגע');
        return;
      }
      const playerId = generateId();
      await set(ref(db, `sessions/${pin.trim()}/players/${playerId}`), {
        name: name.trim().slice(0, 24),
        avatar,
        score: 0,
        streak: 0,
        joinedAt: Date.now(),
      });
      const identity = { pin: pin.trim(), playerId, name: name.trim(), avatar };
      localStorage.setItem('quiz_player', JSON.stringify(identity));
      onJoined(identity);
    } catch (err) {
      console.error(err);
      setError('משהו השתבש, נסו שוב');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="card pop-in" style={{ maxWidth: 400, width: '100%' }}>
      <div className="title" style={{ fontSize: 26, textAlign: 'center', marginBottom: 20 }}>🎮 הצטרפות לחידון</div>
      <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input
          className="input"
          placeholder="קוד הצטרפות (PIN)"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          style={{ textAlign: 'center', fontSize: 22, letterSpacing: 4 }}
          maxLength={6}
        />
        <input
          className="input"
          placeholder="השם שלך"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
        />
        <AvatarPicker value={avatar} onChange={setAvatar} />
        {error && <div style={{ color: 'var(--opt-0)', textAlign: 'center' }}>{error}</div>}
        <button className="btn" type="submit" disabled={joining || !pin.trim() || !name.trim()}>
          {joining ? 'מצטרף/ת...' : '🚀 Start Playing'}
        </button>
      </form>
    </div>
  );
}

function Waiting({ identity }) {
  return (
    <div className="card pop-in" style={{ textAlign: 'center', maxWidth: 360 }}>
      <div style={{ fontSize: 50, marginBottom: 10 }}>
        {identity.avatar?.type === 'photo' ? <img src={identity.avatar.value} alt="" style={{ width: 70, height: 70, borderRadius: 16, objectFit: 'cover' }} /> : identity.avatar?.value}
      </div>
      <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 6 }}>{identity.name}</div>
      <div className="dim">מחכים שהמנחה יתחיל את המשחק...</div>
    </div>
  );
}

function QuestionButtons({ pin, identity, session }) {
  const currentIndex = session.currentIndex;
  const q = session.quiz.questions[currentIndex];
  const [secondsLeft, setSecondsLeft] = useState(q.timeLimit);
  const myAnswer = session.answers?.[currentIndex]?.[identity.playerId];

  useEffect(() => {
    const tick = () => setSecondsLeft(Math.max(0, q.timeLimit - (Date.now() - session.questionStartedAt) / 1000));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [currentIndex, session.questionStartedAt, q.timeLimit]);

  async function answer(optionIndex) {
    if (myAnswer || secondsLeft <= 0) return;
    const elapsed = Date.now() - session.questionStartedAt;
    const correct = optionIndex === q.correctIndex;
    const me = session.players[identity.playerId];
    const streak = correct ? (me.streak || 0) + 1 : 0;
    const points = calcPoints(correct, elapsed, q.timeLimit, me.streak || 0);
    await update(ref(db, `sessions/${pin}`), {
      [`answers/${currentIndex}/${identity.playerId}`]: { optionIndex, answeredAt: Date.now(), correct, points },
      [`players/${identity.playerId}/score`]: (me.score || 0) + points,
      [`players/${identity.playerId}/streak`]: streak,
    });
  }

  if (myAnswer) {
    return (
      <div className="card pop-in" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>✓</div>
        <div style={{ fontWeight: 700, fontSize: 20 }}>תשובה נרשמה</div>
        <div className="dim">ממתינים לשאר השחקנים...</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <Timer secondsLeft={secondsLeft} totalSeconds={q.timeLimit} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, width: '100%' }}>
        {OPTION_STYLES.map((style, i) => (
          <button
            key={i}
            onClick={() => answer(i)}
            disabled={secondsLeft <= 0}
            style={{
              aspectRatio: '1', border: 'none', borderRadius: 20, background: style.color,
              fontSize: 48, color: 'white', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {style.shape}
          </button>
        ))}
      </div>
    </div>
  );
}

function RevealResult({ identity, session }) {
  const q = session.quiz.questions[session.currentIndex];
  const myAnswer = session.answers?.[session.currentIndex]?.[identity.playerId];
  const me = session.players[identity.playerId];
  const correct = myAnswer?.correct;

  return (
    <div className="card pop-in" style={{ textAlign: 'center', maxWidth: 360 }}>
      {myAnswer ? (
        <>
          <div style={{ fontSize: 50, marginBottom: 10 }}>{correct ? '🎉' : '😬'}</div>
          <div style={{ fontWeight: 800, fontSize: 22, color: correct ? '#10b981' : '#ef4444', marginBottom: 6 }}>
            {correct ? 'נכון!' : 'לא נכון'}
          </div>
          {correct && <div className="dim" style={{ marginBottom: 10 }}>+{myAnswer.points} נקודות</div>}
        </>
      ) : (
        <div style={{ marginBottom: 10 }}>לא הספקת לענות</div>
      )}
      <div style={{ fontSize: 18 }}>סה"כ: <b>{me?.score || 0}</b> נקודות</div>
    </div>
  );
}

function FinalResult({ identity, session }) {
  const players = Object.entries(session.players || {}).map(([id, p]) => ({ id, ...p })).sort((a, b) => b.score - a.score);
  const rank = players.findIndex((p) => p.id === identity.playerId) + 1;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

  return (
    <div className="card pop-in" style={{ textAlign: 'center', maxWidth: 360 }}>
      <div style={{ fontSize: 50, marginBottom: 10 }}>{medal || '🏁'}</div>
      <div className="title" style={{ fontSize: 24, marginBottom: 6 }}>מקום {rank}</div>
      <div className="dim">מתוך {players.length} שחקנים</div>
      <div style={{ fontSize: 18, marginTop: 10 }}>סה"כ: <b>{players.find((p) => p.id === identity.playerId)?.score || 0}</b> נקודות</div>
    </div>
  );
}

function PlayerInner() {
  const [searchParams] = useSearchParams();
  const initialPin = searchParams.get('pin') || '';
  const [identity, setIdentity] = useState(null);
  const [session, setSession] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('quiz_player');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!initialPin || initialPin === parsed.pin) {
        setIdentity(parsed);
        setRestoring(false);
        return;
      }
    }
    setIdentity(null);
    setRestoring(false);
  }, [initialPin]);

  useEffect(() => {
    if (!identity) return;
    return onValue(ref(db, `sessions/${identity.pin}`), (snap) => setSession(snap.val()));
  }, [identity]);

  if (restoring) return null;

  if (!identity) {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <JoinScreen initialPin={initialPin} onJoined={setIdentity} />
        <Link to="/" className="dim" style={{ marginTop: 20, textDecoration: 'none' }}>← חזרה</Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="screen" style={{ justifyContent: 'center' }}>
        <Waiting identity={identity} />
      </div>
    );
  }

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      {session.status === 'lobby' && <Waiting identity={identity} />}
      {session.status === 'question' && <QuestionButtons pin={identity.pin} identity={identity} session={session} />}
      {session.status === 'reveal' && <RevealResult identity={identity} session={session} />}
      {session.status === 'final' && <FinalResult identity={identity} session={session} />}
    </div>
  );
}

export default function Player() {
  return <PlayerInner />;
}
