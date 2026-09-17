/**
 * Plain, dependency-free HTML email templates. Inline styles are used because
 * many email clients strip <style> blocks. Each returns a subject + html + text.
 */

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const BRAND = 'ProjectSphere';
const ACCENT = '#4f46e5';

function layout(title: string, bodyHtml: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f4f4f7;padding:32px 0;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #ececf1;">
      <div style="background:${ACCENT};padding:20px 28px;">
        <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">${BRAND}</span>
      </div>
      <div style="padding:28px;color:#1f2937;line-height:1.6;font-size:15px;">
        <h1 style="font-size:19px;margin:0 0 16px;color:#111827;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:18px 28px;background:#fafafa;border-top:1px solid #ececf1;color:#9ca3af;font-size:12px;">
        You received this email because an action was requested on ${BRAND}. If this wasn't you, you can safely ignore it.
      </div>
    </div>
  </div>`;
}

function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:15px;">${label}</a>`;
}

export function verificationEmail(params: {
  name: string;
  verifyUrl: string;
  code: string;
}): RenderedEmail {
  const { name, verifyUrl, code } = params;
  return {
    subject: `Verify your ${BRAND} account`,
    text:
      `Hi ${name},\n\nVerify your email to activate your ${BRAND} account.\n` +
      `Link: ${verifyUrl}\nOr enter this code: ${code}\n\nThis link expires in 15 minutes.`,
    html: layout(
      'Confirm your email',
      `<p>Hi ${name},</p>
       <p>Welcome to ${BRAND}! Confirm your email address to activate your account.</p>
       <p style="margin:24px 0;">${button(verifyUrl, 'Verify email')}</p>
       <p>Or enter this verification code:</p>
       <p style="font-size:26px;font-weight:700;letter-spacing:6px;color:${ACCENT};margin:8px 0 20px;">${code}</p>
       <p style="color:#6b7280;font-size:13px;">This link and code expire in 15 minutes.</p>`,
    ),
  };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
}): RenderedEmail {
  const { name, resetUrl } = params;
  return {
    subject: `Reset your ${BRAND} password`,
    text:
      `Hi ${name},\n\nWe received a request to reset your password.\n` +
      `Reset it here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: layout(
      'Reset your password',
      `<p>Hi ${name},</p>
       <p>We received a request to reset your ${BRAND} password. Click below to choose a new one.</p>
       <p style="margin:24px 0;">${button(resetUrl, 'Reset password')}</p>
       <p style="color:#6b7280;font-size:13px;">This link expires in 1 hour. If you didn't request a reset, you can safely ignore this email — your password won't change.</p>`,
    ),
  };
}

export function welcomeEmail(params: { name: string }): RenderedEmail {
  const { name } = params;
  return {
    subject: `Welcome to ${BRAND}!`,
    text: `Hi ${name},\n\nYour email is verified and your account is ready. Start showcasing your projects!`,
    html: layout(
      'Welcome aboard 🎉',
      `<p>Hi ${name},</p>
       <p>Your email is verified and your ${BRAND} account is ready to go. Build your portfolio, publish projects, and get discovered by recruiters and fellow developers.</p>`,
    ),
  };
}
