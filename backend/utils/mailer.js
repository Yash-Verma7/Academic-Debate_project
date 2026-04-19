const nodemailer = require('nodemailer');
const { normalizeWhitespace } = require('./nameUtils');

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getTransporter = () => {
  const host = normalizeWhitespace(process.env.SMTP_HOST);
  const user = normalizeWhitespace(process.env.SMTP_USER);
  const pass = normalizeWhitespace(process.env.SMTP_PASS);

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: toInt(process.env.SMTP_PORT, 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: { user, pass }
  });
};

const sendPasswordResetEmail = async ({ to, resetLink, name }) => {
  const transporter = getTransporter();
  const from = normalizeWhitespace(process.env.SMTP_FROM) || 'no-reply@academicdebate.local';
  const subject = 'Reset your Academic Debate password';
  const text = `Hi ${name},\n\nUse this link to reset your password:\n${resetLink}\n\nThis link expires in 1 hour.`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin-bottom: 8px;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>Use the button below to reset your password. This link expires in <strong>1 hour</strong>.</p>
      <p style="margin: 18px 0;">
        <a href="${resetLink}" style="display:inline-block;padding:10px 14px;border-radius:10px;color:#ffffff;background:linear-gradient(135deg,#4f46e5,#7c3aed);text-decoration:none;font-weight:600;">
          Reset Password
        </a>
      </p>
      <p>If the button doesn’t work, copy this link:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
    </div>
  `;

  if (!transporter) {
    console.log('[MAILER] SMTP not configured. Password reset link:');
    console.log(resetLink);
    return { delivered: false, fallback: true };
  }

  await transporter.sendMail({ from, to, subject, text, html });
  return { delivered: true, fallback: false };
};

module.exports = { sendPasswordResetEmail };
