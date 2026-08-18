import type { UserRole } from '../utils/jwt';

declare global {
  namespace Express {
    interface AuthenticatedUser {
      id: string;
      role: UserRole;
      tokenVersion: number;
    }

    interface Request {
      /** Populated by `authenticate`; absent on public routes. */
      user?: AuthenticatedUser;
      /** Correlation id echoed back in the `x-request-id` header. */
      id?: string;
    }
  }
}

export {};
