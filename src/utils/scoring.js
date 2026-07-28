// Kahoot-style scoring: faster correct answers earn more points, plus a small streak bonus.
export function calcPoints(correct, elapsedMs, timeLimitSec, streak) {
  if (!correct) return 0;
  const ratio = Math.max(0, 1 - elapsedMs / (timeLimitSec * 1000));
  const base = Math.round(500 + 500 * ratio);
  const streakBonus = Math.min(streak * 50, 200);
  return base + streakBonus;
}
