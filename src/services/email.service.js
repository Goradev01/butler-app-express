require('dotenv').config();
const { Resend } = require('resend');

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[Resend Service] Warning: RESEND_API_KEY environment variable is not defined.');
  }
  return new Resend(apiKey || 're_placeholder_key');
}

/**
 * Send 6-digit OTP verification email via Resend
 * @param {string} toEmail - Recipient email address
 * @param {string} otpCode - 6-digit verification code
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function sendVerificationOtpEmail(toEmail, otpCode) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[Resend Service] Cannot send: RESEND_API_KEY is not configured on this server.');
      return {
        success: false,
        error: 'email service is not configured: RESEND_API_KEY is missing on the server'
      };
    }

    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const baseUrl = (process.env.APP_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const logoUrl = `${baseUrl}/assets/email/crest.png`;

    console.log(`[Resend Service] Dispatching OTP email via Resend to ${toEmail}...`);

    // Colors match the app's own design system (src/theme/colors.ts): pure
    // black canvas, white text/borders, muted grey secondary copy. No accent
    // color — the product itself has none.
    const response = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: 'Butler App - Your Verification Code (OTP)',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #000000; color: #ffffff;">
          <div style="text-align: center; margin-bottom: 28px;">
            <img src="${logoUrl}" width="72" height="98" alt="Butler App" style="display: block; margin: 0 auto 12px; border: 0;" />
            <p style="color: #8d8987; font-size: 12px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Gentlemen's Exclusive Portal</p>
          </div>

          <div style="background: #000000; border: 1px solid #ffffff; border-radius: 12px; padding: 28px 24px; text-align: center;">
            <h2 style="margin: 0 0 12px; color: #ffffff; font-size: 20px; font-weight: 600;">Email Verification Required</h2>
            <p style="color: #bebdbc; font-size: 14px; line-height: 1.5; margin: 0 0 24px;">Thank you for joining the Butler App. Use the 6-digit verification code below to complete your registration:</p>

            <div style="background: #000000; border: 1px solid #ffffff; border-radius: 8px; padding: 16px; display: inline-block;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otpCode}</span>
            </div>

            <p style="color: #8d8987; font-size: 12px; margin: 24px 0 0;">This code is valid for 10 minutes. Intended recipient: ${toEmail}.</p>
          </div>

          <div style="margin-top: 24px; text-align: center; color: #8d8987; font-size: 11px;">
            <p style="margin: 0;">© 2026 Butler App. All rights reserved. 12 Houses of Gentlemen.</p>
          </div>
        </div>
      `
    });

    if (response.error) {
      console.error('[Resend Service] Resend API returned an error:', response.error);
    } else {
      console.log('[Resend Service] Resend API Response:', response);
    }
    return { success: !response.error, data: response.data, error: response.error?.message };
  } catch (error) {
    console.error('[Resend Service] Error sending email via Resend:', error.message || error);
    return { success: false, error: error.message || 'Failed to send verification email' };
  }
}

module.exports = {
  getResendClient,
  sendVerificationOtpEmail
};
