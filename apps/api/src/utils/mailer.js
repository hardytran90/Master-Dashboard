// Sends email over SMTP (Gmail, Outlook, Mailtrap...). Configure via .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
// In development, if SMTP is not configured, the email is printed to the console instead.
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  if (!transporter) {
    const port = Number(SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();

  if (!tx) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP is not configured');
    }
    console.warn('[mailer] SMTP not configured, printing email instead of sending:');
    console.log({ to, subject, text });
    return;
  }

  await tx.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
