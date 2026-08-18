import { z } from 'zod';
import { normalizeEmail, normalizePhone, sanitizeText } from '../../utils/sanitize';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UZ_PHONE_PATTERN = /^\+998\d{9}$/;

/**
 * The client sends one field for "email or phone" so the UI can keep a single
 * input. We detect and normalize it here, once, and every downstream service
 * receives an already-canonical value.
 */
export const identifierSchema = z
  .string()
  .trim()
  .min(3, 'Enter your email or phone number')
  .max(120)
  .transform((raw, ctx) => {
    if (raw.includes('@')) {
      const email = normalizeEmail(raw);
      if (!EMAIL_PATTERN.test(email)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid email address' });
        return z.NEVER;
      }
      return { type: 'email' as const, value: email };
    }

    const phone = normalizePhone(raw);
    if (!UZ_PHONE_PATTERN.test(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid phone number. Expected format: +998 90 123 45 67',
      });
      return z.NEVER;
    }
    return { type: 'phone' as const, value: phone };
  });

export type Identifier = z.infer<typeof identifierSchema>;

/**
 * Length is the dominant factor in password strength, so the floor is 8 with
 * a mixed-character requirement, and the ceiling is 72 because bcrypt
 * silently truncates beyond that — better to reject than to quietly ignore.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/\d/, 'Password must contain a digit');

const nameSchema = z
  .string()
  .trim()
  .min(2, 'Too short')
  .max(50, 'Too long')
  .transform(sanitizeText);

export const otpPurposeSchema = z.enum(['REGISTER', 'LOGIN', 'RESET_PASSWORD']);

export const registerSchema = z.object({
  identifier: identifierSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema.optional(),
});

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, 'Password is required').max(72),
});

export const requestOtpSchema = z.object({
  identifier: identifierSchema,
  purpose: otpPurposeSchema,
});

export const verifyOtpSchema = z.object({
  identifier: identifierSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
  purpose: otpPurposeSchema.default('REGISTER'),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resetPasswordSchema = z.object({
  identifier: identifierSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(72),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'The new password must differ from the current one',
    path: ['newPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
