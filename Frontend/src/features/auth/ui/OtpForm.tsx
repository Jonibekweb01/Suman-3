import { useEffect, useRef, useState } from 'react';
import { authApi } from '../../../entities/user/api';
import { ApiError } from '../../../shared/api/types';
import { cn } from '../../../shared/lib/cn';
import { Button, useToast } from '../../../shared/ui';
import { useVerifyOtp } from '../model/useAuth';
import { useAuthModal } from '../model/useAuthModal';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Six-box OTP entry.
 *
 * Built from individual inputs rather than one text field because it makes the
 * paste, backspace and arrow-key behaviour explicit — and on mobile it keeps
 * the numeric keypad up without the browser trying to autofill a password.
 */
export function OtpForm() {
  const identifier = useAuthModal((state) => state.identifier);
  const setStep = useAuthModal((state) => state.setStep);
  const pushToast = useToast((state) => state.push);
  const verify = useVerifyOtp();

  const [digits, setDigits] = useState<string[]>(Array<string>(CODE_LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const code = digits.join('');

  async function submit(fullCode: string): Promise<void> {
    setError(null);
    try {
      await verify.mutateAsync({ identifier, code: fullCode });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Verification failed');
      setDigits(Array<string>(CODE_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
    }
  }

  function handleChange(index: number, raw: string): void {
    const value = raw.replace(/\D/g, '');
    if (!value) {
      setDigits((prev) => prev.map((digit, i) => (i === index ? '' : digit)));
      return;
    }

    setDigits((prev) => {
      const next = [...prev];
      // A paste lands entirely in one box — spread it across the remaining ones.
      for (let offset = 0; offset < value.length && index + offset < CODE_LENGTH; offset += 1) {
        next[index + offset] = value[offset]!;
      }

      const filled = next.join('');
      const nextEmpty = next.findIndex((digit, i) => i >= index && !digit);
      inputsRef.current[nextEmpty === -1 ? CODE_LENGTH - 1 : nextEmpty]?.focus();

      // Auto-submit the moment the last box is filled: making the user reach
      // for a button after typing six digits is pure friction.
      if (filled.length === CODE_LENGTH && !filled.includes('')) void submit(filled);

      return next;
    });
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputsRef.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus();
  }

  async function resend(): Promise<void> {
    try {
      const challenge = await authApi.requestOtp(identifier, 'REGISTER');
      setCooldown(RESEND_COOLDOWN_SECONDS);
      pushToast(challenge.devCode ? `Dev code: ${challenge.devCode}` : 'New code sent');
    } catch (caught) {
      pushToast(caught instanceof ApiError ? caught.message : 'Could not resend', 'error');
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        We sent a 6-digit code to <span className="font-medium text-ink">{identifier}</span>.
      </p>

      <div className="flex justify-between gap-2" role="group" aria-label="Verification code">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node;
            }}
            value={digit}
            onChange={(event) => handleChange(index, event.target.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={CODE_LENGTH}
            aria-label={`Digit ${index + 1}`}
            className={cn(
              'h-14 w-full rounded-card border bg-surface text-center text-xl font-medium',
              'transition-colors focus:border-ink focus:outline-none',
              error ? 'border-danger' : 'border-line-strong',
            )}
          />
        ))}
      </div>

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}

      <Button
        fullWidth
        size="lg"
        isLoading={verify.isPending}
        disabled={code.length !== CODE_LENGTH}
        onClick={() => void submit(code)}
      >
        Confirm
      </Button>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => setStep('register')}
          className="text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          Change details
        </button>

        <button
          type="button"
          onClick={() => void resend()}
          disabled={cooldown > 0}
          className="text-ink underline underline-offset-4 disabled:text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
        </button>
      </div>
    </div>
  );
}
