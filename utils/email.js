const { Resend } = require('resend');

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Unified email sender using Resend.
 * Replaces SMTP/nodemailer — no password needed, just RESEND_API_KEY in .env
 *
 * @param {Object} options
 * @param {string} options.to       - Recipient email address
 * @param {string} options.subject  - Email subject
 * @param {string} [options.html]   - HTML body
 * @param {string} [options.text]   - Plain text body (fallback)
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const fromAddress = process.env.RESEND_FROM_EMAIL || 'HRMS <noreply@yourdomain.com>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject,
    html: html || `<p>${text || ''}</p>`,
    text: text || undefined
  });

  if (error) {
    console.error('[Resend Email Error]:', error);
    throw new Error(error.message || 'Failed to send email via Resend');
  }

  console.log(`[Resend] Email sent successfully to ${to} | ID: ${data?.id}`);
  return data;
};

module.exports = { sendEmail };
