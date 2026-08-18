import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { authApi } from '../../../entities/user/api';
import { ApiError } from '../../../shared/api/types';
import { Button, Input, useToast } from '../../../shared/ui';
import { useAuthModal } from '../model/useAuthModal';
import {
  forgotSchema,
  resetSchema,
  type ForgotValues,
  type ResetValues,
} from '../model/schemas';

export function ForgotPasswordForm() {
  const { identifier, setIdentifier, setStep } = useAuthModal();
  const pushToast = useToast((state) => state.push);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { identifier },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const challenge = await authApi.forgotPassword(values.identifier);
      setIdentifier(values.identifier);
      setStep('reset');
      if (challenge.devCode) pushToast(`Dev code: ${challenge.devCode}`);
    } catch (error) {
      setError('root', {
        message: error instanceof ApiError ? error.message : 'Could not send the code',
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">
        Enter your email or phone and we will send a code to reset your password.
      </p>

      <Input
        {...register('identifier')}
        label="Email or phone"
        autoComplete="username"
        error={errors.identifier?.message}
        autoFocus
      />

      {errors.root && (
        <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
        Send code
      </Button>

      <button
        type="button"
        onClick={() => setStep('login')}
        className="w-full text-center text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Back to sign in
      </button>
    </form>
  );
}

export function ResetPasswordForm() {
  const { identifier, setStep } = useAuthModal();
  const pushToast = useToast((state) => state.push);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await authApi.resetPassword(identifier, values.code, values.newPassword);
      // The server revoked every session on reset, so the user has to sign in
      // again — send them to the login step rather than pretending otherwise.
      pushToast('Password updated. Please sign in.');
      setStep('login');
    } catch (error) {
      if (error instanceof ApiError) {
        const [field, message] = Object.entries(error.fieldErrors)[0] ?? [];
        if (field === 'code' || field === 'newPassword') setError(field, { message });
        else setError('root', { message: error.message });
        return;
      }
      setError('root', { message: 'Could not reset the password' });
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-muted">
        Enter the code sent to <span className="font-medium text-ink">{identifier}</span>.
      </p>

      <Input
        {...register('code')}
        label="Verification code"
        inputMode="numeric"
        maxLength={6}
        placeholder="000000"
        error={errors.code?.message}
        autoFocus
      />

      <Input
        {...register('newPassword')}
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
      />

      <Input
        {...register('confirmPassword')}
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
      />

      {errors.root && (
        <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" isLoading={isSubmitting}>
        Update password
      </Button>
    </form>
  );
}
