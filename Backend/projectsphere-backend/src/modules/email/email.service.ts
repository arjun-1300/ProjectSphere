import { mailTransporter, mailFrom } from '../../config/mail.js';
import { isTest } from '../../config/env.js';
import {
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
} from './email.templates.js';

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Low-level send. Never throws into the request path: email failures are
 * logged but do not block registration/reset flows (the user can request a
 * resend). In tests, jsonTransport captures the message silently.
 */
async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  try {
    await mailTransporter.sendMail({ from: mailFrom, to, subject, html, text });
  } catch (err) {
    if (!isTest) {
      // eslint-disable-next-line no-console
      console.error(`✉️  Failed to send email to ${to}:`, err);
    }
  }
}

export const emailService = {
  async sendVerification(to: string, name: string, verifyUrl: string, code: string): Promise<void> {
    const { subject, html, text } = verificationEmail({ name, verifyUrl, code });
    await send({ to, subject, html, text });
  },

  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    const { subject, html, text } = passwordResetEmail({ name, resetUrl });
    await send({ to, subject, html, text });
  },

  async sendWelcome(to: string, name: string): Promise<void> {
    const { subject, html, text } = welcomeEmail({ name });
    await send({ to, subject, html, text });
  },
};
