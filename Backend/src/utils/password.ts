import bcrypt from 'bcryptjs';

/**
 * 12 rounds ≈ 250ms on commodity hardware in 2025 — slow enough to make
 * offline cracking expensive, fast enough not to stall the event loop queue
 * under normal login traffic.
 */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Burn roughly the same amount of CPU as a real comparison when the account
 * does not exist. Without this, response timing tells an attacker which
 * emails are registered.
 */
export async function fakeVerifyPassword(): Promise<void> {
  await bcrypt.compare(
    'timing-attack-mitigation',
    '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3Ln0f2N/6qYQvHqkD4rD3sT.gk3Q9tK',
  );
}
