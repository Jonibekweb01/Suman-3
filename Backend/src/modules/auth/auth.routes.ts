import { Router } from 'express';
import { authenticate, verifyAccountState } from '../../middlewares/auth.middleware';
import { verifyCsrf } from '../../middlewares/csrf.middleware';
import { authLimiter, otpLimiter } from '../../middlewares/rateLimit.middleware';
import { validate } from '../../middlewares/validate.middleware';
import * as controller from './auth.controller';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  requestOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.schema';

export const authRouter: Router = Router();

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);

authRouter.post('/otp/request', otpLimiter, validate({ body: requestOtpSchema }), controller.requestOtp);
authRouter.post('/otp/verify', authLimiter, validate({ body: verifyOtpSchema }), controller.verifyOtp);

// Cookie-authenticated: these are the only two routes that need CSRF cover.
authRouter.post('/refresh', authLimiter, verifyCsrf, controller.refresh);
authRouter.post('/logout', verifyCsrf, controller.logout);

authRouter.post(
  '/password/forgot',
  otpLimiter,
  validate({ body: forgotPasswordSchema }),
  controller.forgotPassword,
);
authRouter.post(
  '/password/reset',
  authLimiter,
  validate({ body: resetPasswordSchema }),
  controller.resetPassword,
);
authRouter.patch(
  '/password/change',
  authenticate,
  verifyAccountState,
  validate({ body: changePasswordSchema }),
  controller.changePassword,
);

authRouter.get('/me', authenticate, controller.me);
authRouter.post('/logout-all', authenticate, controller.logoutEverywhere);
