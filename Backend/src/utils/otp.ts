import crypto from 'node:crypto';

/**
 * 6-digit numeric OTP drawn from a CSPRNG.
 *
 * `randomInt` is used rather than `Math.random()` (predictable) and rather
 * than a modulo of random bytes (biased toward low digits).
 */
export function generateOtp(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += crypto.randomInt(0, 10).toString();
  }
  return code;
}

export function hashOtp(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Constant-time comparison — a plain `===` on hashes leaks how many leading
 * characters matched through timing.
 */
export function compareOtp(code: string, hash: string): boolean {
  const candidate = Buffer.from(hashOtp(code), 'hex');
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
}
