import { env } from '../../config/env';
import { logger } from '../../core/logger';
import nodemailer from 'nodemailer';

/**
 * Delivery adapter for one-time codes.
 *
 * The transport is intentionally the only thing swapped per environment: in
 * development the code is logged (and echoed to the client) so the flow can be
 * exercised without an SMS bill; in production `sendSms` / `sendEmail` are the
 * single place to wire Eskiz/Play Mobile and an SMTP or Resend client.
 */

export interface OtpMessage {
  identifier: string;
  type: 'email' | 'phone';
  code: string;
  purpose: 'REGISTER' | 'LOGIN' | 'RESET_PASSWORD';
  expiresInMinutes: number;
}

const PURPOSE_COPY: Record<OtpMessage['purpose'], string> = {
  REGISTER: 'Suman: confirm your account',
  LOGIN: 'Suman: sign-in code',
  RESET_PASSWORD: 'Suman: password reset code',
};

let eskizToken: string | null = null;

function requireConfig(values: Array<[string, string | undefined]>): void {
  const missing = values.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Notification transport is not configured: ${missing.join(', ')}`);
  }
}

async function getEskizToken(): Promise<string> {
  if (eskizToken) return eskizToken;

  requireConfig([
    ['ESKIZ_EMAIL', env.ESKIZ_EMAIL],
    ['ESKIZ_PASSWORD', env.ESKIZ_PASSWORD],
  ]);

  const response = await fetch(`${env.ESKIZ_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: env.ESKIZ_EMAIL!, password: env.ESKIZ_PASSWORD! }),
    signal: AbortSignal.timeout(10_000),
  });
  const result = (await response.json()) as { data?: { token?: string }; message?: string };

  if (!response.ok || !result.data?.token) {
    throw new Error(`Eskiz authentication failed: ${result.message ?? response.statusText}`);
  }

  eskizToken = result.data.token;
  return eskizToken;
}

async function sendEskizSms(phone: string, text: string): Promise<void> {
  const response = await fetch(`${env.ESKIZ_BASE_URL}/api/message/sms/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getEskizToken()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mobile_phone: phone.replace(/\D/g, ''),
      message: text,
      from: env.ESKIZ_SENDER,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    eskizToken = null;
    throw new Error(`Eskiz SMS failed (${response.status}): ${errorText.slice(0, 300)}`);
  }
}

async function sendSms(phone: string, text: string): Promise<void> {
  if (env.OTP_DELIVERY_MODE === 'log') {
    logger.info({ channel: 'sms', to: phone, text }, 'OTP (development transport)');
    return;
  }
  await sendEskizSms(phone, text);
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  if (env.OTP_DELIVERY_MODE === 'log') {
    logger.info({ channel: 'email', to, subject, text }, 'OTP (development transport)');
    return;
  }
  requireConfig([
    ['SMTP_HOST', env.SMTP_HOST],
    ['SMTP_USER', env.SMTP_USER],
    ['SMTP_PASSWORD', env.SMTP_PASSWORD],
    ['SMTP_FROM', env.SMTP_FROM],
  ]);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });

  await transporter.sendMail({ from: env.SMTP_FROM, to, subject, text });
}

export async function deliverOtp(message: OtpMessage): Promise<void> {
  const body = `Your Suman verification code is ${message.code}. It expires in ${message.expiresInMinutes} minutes. Do not share it with anyone.`;

  if (message.type === 'phone') {
    await sendSms(message.identifier, body);
    return;
  }
  await sendEmail(message.identifier, PURPOSE_COPY[message.purpose], body);
}

export async function notifyOrderPlaced(params: {
  identifier: string;
  type: 'email' | 'phone';
  orderNumber: string;
  total: number;
  currency: string;
}): Promise<void> {
  const amount = (params.total / 100).toLocaleString('en-US');
  const body = `Suman: order ${params.orderNumber} received. Total ${amount} ${params.currency}. We will contact you shortly.`;

  try {
    if (params.type === 'phone') {
      await sendSms(params.identifier, body);
    } else {
      await sendEmail(params.identifier, `Order ${params.orderNumber} confirmed`, body);
    }
  } catch (error) {
    // A failed receipt must never roll back a paid order.
    logger.error({ err: error, orderNumber: params.orderNumber }, 'Order notification failed');
  }
}
