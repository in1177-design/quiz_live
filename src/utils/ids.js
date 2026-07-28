export function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
