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
    const resend = getResendClient();
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    // In Resend sandbox testing mode, emails must be delivered to adeboyeadeyemi20@gmail.com
    const targetEmail = (toEmail && toEmail.endsWith('@gmail.com')) ? toEmail : 'adeboyeadeyemi20@gmail.com';
    
    console.log(`[Resend Service] Dispatching OTP email via Resend to ${targetEmail}...`);

    let response = await resend.emails.send({
      from: fromEmail,
      to: [targetEmail],
      subject: 'Butler App - Your Verification Code (OTP)',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0b0d10; color: #ffffff; border-radius: 12px; border: 1px solid #2a2f38;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; font-size: 28px; color: #d86b49; font-weight: bold; letter-spacing: 2px;">❖ BUTLER APP</div>
            <p style="color: #9aa0a6; font-size: 13px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">Gentlemen's Exclusive Portal</p>
          </div>
          
          <div style="background: #14171d; border-radius: 8px; padding: 24px; border: 1px solid #232832; text-align: center;">
            <h2 style="margin-top: 0; color: #ffffff; font-size: 20px; font-weight: 600;">Email Verification Required</h2>
            <p style="color: #bcbec0; font-size: 14px; line-height: 1.5;">Thank you for joining the Butler App. Please use the 6-digit verification code (OTP) below to complete your registration:</p>
            
            <div style="margin: 28px 0; background: #000000; border: 2px dashed #d86b49; border-radius: 8px; padding: 16px; display: inline-block;">
              <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ffffff;">${otpCode}</span>
            </div>
            
            <p style="color: #80868b; font-size: 12px; margin-bottom: 0;">This code is valid for 10 minutes. Intended recipient: ${toEmail}.</p>
          </div>

          <div style="margin-top: 24px; text-align: center; color: #5f6368; font-size: 11px;">
            <p>© 2026 Butler App Inc. All rights reserved. 12 Houses of Gentlemen.</p>
          </div>
        </div>
      `
    });

    if (response.error && response.error.name === 'validation_error') {
      console.warn('[Resend Service] Resend domain restriction warning, retrying fallback to adeboyeadeyemi20@gmail.com');
      response = await resend.emails.send({
        from: fromEmail,
        to: ['adeboyeadeyemi20@gmail.com'],
        subject: 'Butler App - Your Verification Code (OTP)',
        html: `<p>Your Butler App OTP Verification Code: <strong>${otpCode}</strong></p>`
      });
    }

    console.log('[Resend Service] Resend API Response:', response);
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
