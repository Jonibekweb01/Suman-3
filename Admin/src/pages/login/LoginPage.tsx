import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../../entities/auth/model';
import { useAdminLogin } from '../../features/auth/useAdminAuth';
import { ApiError } from '../../shared/api/types';
import { Button, ErrorBanner, Input, Spinner } from '../../shared/ui';

const loginSchema = z.object({
  identifier: z.string().trim().min(3, 'Enter your email or phone'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const location = useLocation() as { state?: { from?: string } };
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);
  const login = useAdminLogin();

  const {
    register,
    handleSubmit,
    setError,
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

      const [field, message] = Object.entries(error.fieldErrors)[0] ?? [];
      if (field === 'identifier' || field === 'password') setError(field, { message });
      else setError('root', { message: error.message });
    }
  });

  if (isBootstrapping) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Spinner size={28} className="text-muted" />
      </div>
    );
  }

  // Already signed in — bounce straight to wherever the guard interrupted.
  if (isAuthenticated && role === 'ADMIN') {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold tracking-tight">Suman</p>
          <p className="mt-1 text-[13px] text-muted">Administrator sign-in</p>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          <Input
            {...register('identifier')}
            label="Email or phone"
            autoComplete="username"
            error={errors.identifier?.message}
            autoFocus
          />

          <Input
            {...register('password')}
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
          />

          {errors.root && <ErrorBanner message={errors.root.message ?? 'Sign-in failed'} />}

          <Button type="submit" className="w-full" isLoading={login.isPending}>
            Sign in
          </Button>
        </form>

        <p className="mt-4 text-center text-[12px] text-muted">
          This area is restricted to accounts with the administrator role.
        </p>
      </div>
    </div>
  );
}
