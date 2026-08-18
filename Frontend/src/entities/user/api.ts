import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/api/client';
import type { Session, User } from '../../shared/types/commerce';

export interface RegisterPayload {
  identifier: string;
  password: string;
  firstName: string;
  lastName?: string;
}

export interface OtpChallenge {
  message: string;
  identifier?: string;
  expiresAt: string;
  /** Present only outside production — lets dev skip a real SMS gateway. */
  devCode?: string;
}

export const authApi = {
  register(payload: RegisterPayload): Promise<OtpChallenge> {
    return apiPost<OtpChallenge>('/auth/register', payload);
  },

  verifyOtp(identifier: string, code: string, purpose = 'REGISTER'): Promise<Session> {
    return apiPost<Session>('/auth/otp/verify', { identifier, code, purpose });
  },

  requestOtp(identifier: string, purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD'): Promise<OtpChallenge> {
    return apiPost<OtpChallenge>('/auth/otp/request', { identifier, purpose });
  },

  login(identifier: string, password: string): Promise<Session> {
    return apiPost<Session>('/auth/login', { identifier, password });
  },

  logout(): Promise<void> {
    return apiPost<void>('/auth/logout');
  },

  me(): Promise<User> {
    return apiGet<User>('/auth/me');
  },

  forgotPassword(identifier: string): Promise<OtpChallenge> {
    return apiPost<OtpChallenge>('/auth/password/forgot', { identifier });
  },

  resetPassword(identifier: string, code: string, newPassword: string): Promise<{ message: string }> {
    return apiPost<{ message: string }>('/auth/password/reset', { identifier, code, newPassword });
  },

  changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiPatch<{ message: string }>('/auth/password/change', { currentPassword, newPassword });
  },
};

export const userApi = {
  updateProfile(payload: { firstName?: string; lastName?: string | null }): Promise<User> {
    return apiPatch<User>('/users/me', payload);
  },

  deleteAccount(): Promise<{ deleted: boolean }> {
    return apiDelete<{ deleted: boolean }>('/users/me');
  },
};
