import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface SendEmailPayload {
  to?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

export interface ContactEmailData {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
}

/**
 * Creates a Nodemailer SMTP transporter.
 */
const getTransporter = () => {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
};

/**
 * Generic email sending function using SMTP.
 */
export const sendEmail = async (payload: SendEmailPayload): Promise<boolean> => {
  const transporter = getTransporter();

  if (!transporter) {
    logger.warn('[SMTP] Skipping email send: SMTP_USER or SMTP_PASS environment variables are missing.');
    return false;
  }

  try {
    const recipient = payload.to || env.CONTACT_RECEIVER_EMAIL || env.SMTP_USER || env.ADMIN_EMAIL;
    const fromAddress = env.SMTP_FROM || `"Portfolio Contact" <${env.SMTP_USER}>`;

    const mailOptions = {
      from: fromAddress,
      to: recipient,
      replyTo: payload.replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`[SMTP] Email sent successfully. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error('[SMTP] Failed to send email via SMTP:', error);
    return false;
  }
};

/**
 * Sends notification email to the admin/portfolio owner upon receiving a new contact message.
 */
export const sendContactNotificationEmail = async (data: ContactEmailData): Promise<boolean> => {
  const adminSubject = `📩 New Portfolio Inquiry: ${data.subject}`;
  const textContent = `
New Contact Message Received:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'N/A'}
Subject: ${data.subject}

Message:
${data.message}
  `.trim();

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fdfbf7; border: 1px solid #e0d8cf; border-radius: 12px; padding: 24px; color: #171310;">
      <h2 style="color: #b5502f; margin-top: 0; font-size: 20px;">📩 New Portfolio Contact Submission</h2>
      <p style="font-size: 14px; color: #555;">You have received a new inquiry from your portfolio website.</p>
      <hr style="border: none; border-top: 1px solid #e0d8cf; margin: 20px 0;" />
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
        <tr>
          <td style="padding: 6px 0; font-weight: bold; width: 120px;">From Name:</td>
          <td style="padding: 6px 0;">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold;">Email:</td>
          <td style="padding: 6px 0;"><a href="mailto:${data.email}" style="color: #b5502f; text-decoration: none;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold;">Phone/WhatsApp:</td>
          <td style="padding: 6px 0;">${data.phone || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: bold;">Subject:</td>
          <td style="padding: 6px 0;">${data.subject}</td>
        </tr>
      </table>

      <div style="background-color: #ffffff; border: 1px solid #e6dfd5; border-radius: 8px; padding: 16px; font-size: 14px; white-space: pre-wrap; line-height: 1.6;">${data.message}</div>

      <div style="margin-top: 24px; font-size: 12px; color: #888; text-align: center;">
        Sent automatically by your Portfolio API
      </div>
    </div>
  `.trim();

  return sendEmail({
    subject: adminSubject,
    text: textContent,
    html: htmlContent,
    replyTo: data.email,
  });
};

/**
 * Optional: Sends an auto-confirmation email back to the client/visitor.
 */
export const sendVisitorAutoResponse = async (data: ContactEmailData): Promise<boolean> => {
  if (!data.email) return false;

  const subject = `Thank you for reaching out, ${data.name}!`;
  const textContent = `Hi ${data.name},\n\nThank you for getting in touch through my portfolio. I have received your message regarding "${data.subject}" and will respond as soon as possible.\n\nBest regards,\nNaim`;

  const htmlContent = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 12px; padding: 28px; color: #171310;">
      <h2 style="color: #171310; margin-top: 0; font-size: 22px;">Thank you for reaching out, ${data.name}!</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        I have received your message regarding <strong>"${data.subject}"</strong>.
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        I will review your message and get back to you as soon as possible.
      </p>
      <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
      <p style="font-size: 14px; color: #666; margin-bottom: 0;">
        Warm regards,<br />
        <strong>Naim</strong>
      </p>
    </div>
  `.trim();

  return sendEmail({
    to: data.email,
    subject,
    text: textContent,
    html: htmlContent,
  });
};
