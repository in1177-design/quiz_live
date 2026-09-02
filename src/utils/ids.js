import { ref, get } from 'firebase/database';
import { db } from '../firebase.js';

export function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// A quiz's permanent join code (used as its session id). Checked against active
// sessions so it never collides with another quiz's live game.
export async function generateUniqueSessionCode() {
  let code = generatePin();
  for (let i = 0; i < 5; i++) {
    const snap = await get(ref(db, `sessions/${code}`));
    if (!snap.exists()) break;
    code = generatePin();
  }
  return code;
}

export function joinUrl(pin) {
  return `${window.location.origin}${window.location.pathname}#/play?pin=${pin}`;
}
