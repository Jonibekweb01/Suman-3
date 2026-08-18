import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Conditional classes + Tailwind conflict resolution.
 *
 * `twMerge` is what makes component variants composable: a caller passing
 * `className="px-8"` should win over the component's own `px-4`, and plain
 * string concatenation would leave both in the class list with the winner
 * decided by stylesheet order rather than intent.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
