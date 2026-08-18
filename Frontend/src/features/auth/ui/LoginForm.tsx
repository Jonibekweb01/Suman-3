import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../../shared/api/types';
import { Button, Input } from '../../../shared/ui';
import { useLogin } from '../model/useAuth';
import { useAuthModal } from '../model/useAuthModal';
import { loginSchema, type LoginValues } from '../model/schemas';

export function LoginForm() {
  const setStep = useAuthModal((state) => state.setStep);
  const setIdentifier = useAuthModal((state) => state.setIdentifier);
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login.mutateAsync(values);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      // An unverified account is not a failure — it is a redirect to the
      // step the user actually needs.
      if (error.status === 403 && error.message.toLowerCase().includes('not verified')) {
        setIdentifier(values.identifier);
        setStep('otp');
        return;
      }

      // Map server field errors onto the form; fall back to a root error.
      const [field, message] = Object.entries(error.fieldErrors)[0] ?? [];
      if (field === 'identifier' || field === 'password') {
        setError(field, { message });
      } else {
        setError('root', { message: error.message });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Input
        {...register('identifier')}
        label="Email or phone"
        placeholder="you@example.com"
        type="text"
        autoComplete="username"
        inputMode="email"
        error={errors.identifier?.message}
        autoFocus
      />

      <Input
        {...register('password')}
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        error={errors.password?.message}
      />

      {errors.root && (
        <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setIdentifier(getValues('identifier'));
          setStep('forgot');
        }}
        className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline"
      >
        Forgot your password?
      </button>

      <Button type="submit" fullWidth size="lg" isLoading={login.isPending}>
        Sign in
      </Button>

      <p className="pt-1 text-center text-sm text-muted">
        New to Suman?{' '}
        <button
          type="button"
          onClick={() => setStep('register')}
          className="font-medium text-ink underline underline-offset-4"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}
