import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'hot' | 'glass';
type Size = 'sm' | 'md' | 'lg';

/**
 * Primary is the indigo gradient with a coloured glow — the single most
 * conversion-critical surface in the app, so it gets the only shadow in the
 * system that is tinted rather than neutral. `hot` is its urgency twin,
 * reserved for time-boxed offers so the two never compete on one screen.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-e1 hover:bg-brand-strong hover:shadow-e2 disabled:bg-line-strong disabled:shadow-none',
  accent: 'bg-brand text-white shadow-e1 hover:bg-brand-strong hover:shadow-e2',
  hot: 'badge-hot text-white hover:brightness-110',
  secondary: 'bg-surface text-ink shadow-e1 hover:shadow-e2 hover:-translate-y-0.5',
  ghost: 'bg-transparent text-ink-soft hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-white shadow-e2 hover:brightness-110',
  glass: 'glass-light text-ink shadow-e2 hover:bg-white/90',
};

const SIZES: Record<Size, string> = {
  // 44px minimum touch target on every size — mobile-first, not an afterthought.
  sm: 'h-11 px-4 text-sm gap-1.5 rounded-field',
  md: 'h-12 px-6 text-sm gap-2 rounded-field',
  lg: 'h-14 px-8 text-base gap-2.5 rounded-field',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      // Screen readers need to know the control is busy; a spinner is visual only.
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-semibold tracking-tight',
        'transition-all duration-200 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // Tactile press response — the haptic stand-in on a touch screen.
        'active:scale-95 motion-reduce:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading ? <Spinner size={size === 'lg' ? 20 : 16} /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});
