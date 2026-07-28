export const AVATAR_EMOJIS = [
  '🦊', '🐼', '🐸', '🦁', '🐨', '🐵', '🦄', '🐯',
  '🐙', '🦉', '🐝', '🦋', '🐢', '🦖', '🐬', '🦩',
];

export const AVATAR_COLORS = [
  '#FF5A5F', '#5B7FFF', '#FFC93C', '#2ED9C3',
  '#A78BFA', '#FF8AB8', '#4ADE80', '#FB923C',
];

export function avatarColorFor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
