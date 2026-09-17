import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from './env.js';

/**
 * Shared Nodemailer transporter.
 *
 * Dev/prod use real SMTP (Mailtrap sandbox in dev, Gmail/SES in prod).
 * In tests we use a JSON transport that captures messages without sending.
 */
export const mailTransporter: Transporter = isTest
  ? nodemailer.createTransport({ jsonTransport: true })
  : nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      // 465 = implicit TLS; anything else uses STARTTLS.
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });

export const mailFrom = `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM_EMAIL}>`;
