import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../entities/user/store';
import { useAuthModal, type AuthStep } from '../../features/auth/model/useAuthModal';
import { LoginForm } from '../../features/auth/ui/LoginForm';
import { OtpForm } from '../../features/auth/ui/OtpForm';
import { RegisterForm } from '../../features/auth/ui/RegisterForm';
import {
  ForgotPasswordForm,
  ResetPasswordForm,
} from '../../features/auth/ui/PasswordForms';
import { Spinner } from '../../shared/ui';

const VALID_STEPS: AuthStep[] = ['login', 'register', 'otp', 'forgot', 'reset'];

const HEADINGS: Record<AuthStep, { title: string; copy: string }> = {
  login: { title: 'Welcome back', copy: 'Sign in to pick up where you left off.' },
  register: { title: 'Create your account', copy: 'One account for orders, wishlist and faster checkout.' },
  otp: { title: 'Confirm your code', copy: 'Almost there — enter the code we sent you.' },
  forgot: { title: 'Reset your password', copy: 'We will send a code to your email or phone.' },
  reset: { title: 'Choose a new password', copy: 'Pick something you have not used before.' },
};

/**
 * Standalone auth page.
 *
 * The modal is the primary path, but a dedicated route matters for the cases a
 * modal cannot serve: a link emailed to the user, a deep link from the mobile
 * shell, or a browser that blocks the overlay. It reuses the exact same form
 * components so the two never drift apart.
 */
export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  const step = useAuthModal((state) => state.step);
  const setStep = useAuthModal((state) => state.setStep);
  const closeModal = useAuthModal((state) => state.close);

  const requestedStep = searchParams.get('step') as AuthStep | null;

  useEffect(() => {
    // The page and the modal share one store, so make sure the overlay is not
    // also open on top of this page.
    closeModal();
    if (requestedStep && VALID_STEPS.includes(requestedStep)) setStep(requestedStep);
  }, [requestedStep, setStep, closeModal]);

  if (isBootstrapping) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner size={28} className="text-muted" />
      </div>
    );
  }

  if (isAuthenticated) return <Navigate to="/" replace />;

  const heading = HEADINGS[step];

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl tracking-tight">{heading.title}</h1>
          <p className="mt-2 text-sm text-muted">{heading.copy}</p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 sm:p-8">
          {step === 'login' && <LoginForm />}
          {step === 'register' && <RegisterForm />}
          {step === 'otp' && <OtpForm />}
          {step === 'forgot' && <ForgotPasswordForm />}
          {step === 'reset' && <ResetPasswordForm />}
        </div>
      </div>
    </div>
  );
}
