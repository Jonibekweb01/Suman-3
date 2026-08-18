import { z } from 'zod';

/**
 * Client-side mirrors of the server contracts.
 *
 * These exist for instant feedback, NOT as a security boundary — the server
 * revalidates everything. Keeping the messages identical to the backend's
 * means a field that slips past here reads the same when the server rejects it.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const identifierField = z
  .string()
  .trim()
  .min(3, 'Enter your email or phone number')
  .refine(
    (value) => {
      if (value.includes('@')) return EMAIL_PATTERN.test(value.toLowerCase());
      const digits = value.replace(/\D/g, '');
      return digits.length === 9 || (digits.length === 12 && digits.startsWith('998'));
    },
    { message: 'Enter a valid email or Uzbek phone number' },
  );

export const passwordField = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a digit');

export const loginSchema = z.object({
  identifier: identifierField,
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'At least 2 characters').max(50),
  lastName: z.string().trim().max(50).optional(),
  identifier: identifierField,
  password: passwordField,
});

export const otpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const forgotSchema = z.object({
  identifier: identifierField,
});

export const resetSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit code'),
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type OtpValues = z.infer<typeof otpSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;

/**
 * Rough password strength for the meter. Deliberately simple and local —
 * shipping zxcvbn would add ~400KB to solve a cosmetic problem.
 */
export function passwordStrength(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;
  return { score: clamped, label: labels[clamped] };
}
