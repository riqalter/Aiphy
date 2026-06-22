import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // true for 465, false for other ports
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

export interface SendMailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendMailOptions): Promise<void> {
  // If SMTP config is missing (e.g. in dev), log the email instead of throwing
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.log('====== EMAIL DEV MODE (SMTP NOT CONFIGURED) ======');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Text: ${text || 'N/A'}`);
    console.log(`HTML: ${html || 'N/A'}`);
    console.log('==================================================');
    return;
  }

  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email] Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`[Email] Failed to send email to ${to}:`, error);
    throw error;
  }
}
