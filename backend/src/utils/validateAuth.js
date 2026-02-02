const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email) {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
}

export function isValidEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized !== null && EMAIL_REGEX.test(normalized);
}

export function validatePassword(password) {
  if (typeof password !== "string") return { ok: false, error: "password_required" };
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: "password_too_short", min: MIN_PASSWORD_LENGTH };
  }
  return { ok: true };
}
