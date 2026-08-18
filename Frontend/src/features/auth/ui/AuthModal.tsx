import { AnimatePresence, motion } from 'framer-motion';
import { Modal } from '../../../shared/ui';
import { useAuthModal } from '../model/useAuthModal';
import { ForgotPasswordForm, ResetPasswordForm } from './PasswordForms';
import { LoginForm } from './LoginForm';
import { OtpForm } from './OtpForm';
import { RegisterForm } from './RegisterForm';

const TITLES: Record<string, string> = {
  login: 'Welcome back',
  register: 'Create your account',
  otp: 'Confirm your code',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
};

/**
 * Quick-auth modal.
 *
 * A single overlay hosts all five steps so a guest who taps "add to wishlist"
 * can sign in and land back exactly where they were, instead of being thrown
 * to a dedicated page and losing context.
 */
export function AuthModal() {
  const { isOpen, step, close } = useAuthModal();

  return (
    <Modal open={isOpen} onClose={close} title={TITLES[step]} variant="sheet" size="sm">
      {/* `mode="wait"` prevents two steps overlapping mid-transition, which
          would otherwise make the sheet visibly jump in height. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 'login' && <LoginForm />}
          {step === 'register' && <RegisterForm />}
          {step === 'otp' && <OtpForm />}
          {step === 'forgot' && <ForgotPasswordForm />}
          {step === 'reset' && <ResetPasswordForm />}
        </motion.div>
      </AnimatePresence>
    </Modal>
  );
}
