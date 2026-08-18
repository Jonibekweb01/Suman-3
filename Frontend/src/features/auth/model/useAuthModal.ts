import { create } from 'zustand';

export type AuthStep = 'login' | 'register' | 'otp' | 'forgot' | 'reset';

interface AuthModalState {
  isOpen: boolean;
  step: AuthStep;
  /** Email or phone carried between steps (register → OTP, forgot → reset). */
  identifier: string;
  /** Path to return to after a guard-triggered sign-in. */
  redirectTo: string | null;

  open: (step?: AuthStep, redirectTo?: string) => void;
  close: () => void;
  setStep: (step: AuthStep) => void;
  setIdentifier: (identifier: string) => void;
}

/**
 * Auth modal state as a store rather than local component state.
 *
 * The trigger can be anywhere — the header button, a protected route guard, an
 * "add to wishlist" tap by a guest — and none of those places should have to
 * own the modal or thread props down to it.
 */
export const useAuthModal = create<AuthModalState>((set) => ({
  isOpen: false,
  step: 'login',
  identifier: '',
  redirectTo: null,

  open: (step = 'login', redirectTo) =>
    set({ isOpen: true, step, redirectTo: redirectTo ?? null }),

  close: () => set({ isOpen: false, identifier: '', redirectTo: null }),

  setStep: (step) => set({ step }),
  setIdentifier: (identifier) => set({ identifier }),
}));
