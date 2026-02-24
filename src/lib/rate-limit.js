// Simple in-memory rate limiter
const attempts = new Map();

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 10; // max attempts per window

export function checkRateLimit(key) {
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.start > WINDOW_MS) {
    attempts.set(key, { start: now, count: 1 });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }

  record.count++;

  if (record.count > MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - record.count };
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attempts) {
    if (now - record.start > WINDOW_MS) {
      attempts.delete(key);
    }
  }
}, 60 * 1000);
