const COOLDOWN_MS = 60_000;
const keyFor = (email: string) => `verification-code-sent:${email.trim().toLowerCase()}`;

export function recordVerificationCodeSent(email: string) {
  localStorage.setItem(keyFor(email), String(Date.now()));
}

export function verificationCooldownSeconds(email: string) {
  const sentAt = Number(localStorage.getItem(keyFor(email)));
  if (!sentAt || !Number.isFinite(sentAt)) return 0;
  return Math.max(0, Math.min(60, Math.ceil((sentAt + COOLDOWN_MS - Date.now()) / 1000)));
}
