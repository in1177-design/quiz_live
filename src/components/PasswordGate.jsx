import { useState } from 'react';
import { ADMIN_PASSWORD } from '../firebase.js';

export default function PasswordGate({ children, label }) {
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem('quiz_admin_ok') === '1');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  if (unlocked) return children;

  function submit(e) {
    e.preventDefault();
    if (value === ADMIN_PASSWORD) {
      sessionStorage.setItem('quiz_admin_ok', '1');
      setUnlocked(true);
    } else {
      setError('סיסמה שגויה');
    }
  }

  return (
    <div className="screen" style={{ justifyContent: 'center' }}>
      <form onSubmit={submit} className="card pop-in" style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
        <div className="title" style={{ fontSize: 24, marginBottom: 20 }}>🔒 {label}</div>
        <input
          className="input"
          type="password"
          placeholder="סיסמה"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          style={{ width: '100%', marginBottom: 12, textAlign: 'center' }}
          autoFocus
        />
        {error && <div style={{ color: 'var(--opt-0)', marginBottom: 12 }}>{error}</div>}
        <button className="btn" style={{ width: '100%' }} type="submit">כניסה</button>
      </form>
    </div>
  );
}
