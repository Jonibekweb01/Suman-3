import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiError } from '../../../shared/api/types';
import { cn } from '../../../shared/lib/cn';
import { Button, Input, useToast } from '../../../shared/ui';
import { useRegister } from '../model/useAuth';
import { useAuthModal } from '../model/useAuthModal';
import { passwordStrength, registerSchema, type RegisterValues } from '../model/schemas';

const STRENGTH_COLORS = ['bg-line-strong', 'bg-danger', 'bg-accent', 'bg-accent', 'bg-success'];

export function RegisterForm() {
  const setStep = useAuthModal((state) => state.setStep);
  const setIdentifier = useAuthModal((state) => state.setIdentifier);
  const pushToast = useToast((state) => state.push);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    // Validate as the user types once a field has been touched — waiting for
    // submit to reveal four errors at once is the worse experience.
    mode: 'onTouched',
    defaultValues: { firstName: '', lastName: '', identifier: '', password: '' },
  });

  const password = watch('password') ?? '';
  const strength = passwordStrength(password);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const challenge = await registerMutation.mutateAsync(values);
      setIdentifier(values.identifier);
      setStep('otp');

      // Outside production the API returns the code so the flow is testable
      // without an SMS gateway.
      if (challenge.devCode) pushToast(`Dev code: ${challenge.devCode}`);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      const entries = Object.entries(error.fieldErrors);
      if (entries.length > 0) {
        for (const [field, message] of entries) {
          if (field === 'identifier' || field === 'password' || field === 'firstName') {
            setError(field, { message });
          }
        }
      } else {
        setError('root', { message: error.message });
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-3">
        <Input
          {...register('firstName')}
          label="First name"
          autoComplete="given-name"
          error={errors.firstName?.message}
          autoFocus
        />
        <Input {...register('lastName')} label="Last name" autoComplete="family-name" />
      </div>

      <Input
        {...register('identifier')}
        label="Email or phone"
        placeholder="+998 90 123 45 67"
        autoComplete="username"
        hint="We will send a 6-digit confirmation code"
        error={errors.identifier?.message}
      />

      <div>
        <Input
          {...register('password')}
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
        />

        {password.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((segment) => (
                <span
                  key={segment}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-300',
                    segment < strength.score ? STRENGTH_COLORS[strength.score] : 'bg-line',
                  )}
                />
              ))}
            </div>
            <span className="w-16 text-right text-xs text-muted">{strength.label}</span>
          </div>
        )}
      </div>

      {errors.root && (
        <p role="alert" className="rounded-card bg-danger-soft px-3 py-2 text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" fullWidth size="lg" isLoading={registerMutation.isPending}>
        Create account
      </Button>

      <p className="text-center text-xs leading-relaxed text-muted">
        By creating an account you agree to our Terms of Service and Privacy Policy.
      </p>

      <p className="text-center text-sm text-muted">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => setStep('login')}
          className="font-medium text-ink underline underline-offset-4"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}
