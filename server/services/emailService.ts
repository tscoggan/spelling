import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail: 'onboarding@resend.dev' // Default Resend email for testing
  };
}

export async function sendPasswordResetEmail(
  toEmail: string, 
  username: string, 
  resetToken: string
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  
  // Get the correct Replit domain or fallback to localhost for development
  const domain = process.env.REPLIT_DOMAINS || 'localhost:5000';
  const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
  const resetUrl = `${protocol}://${domain}/reset-password?token=${resetToken}`;

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: 'Spelling Champions - Password Reset',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .button:hover { background: #4338ca; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Spelling Champions</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hi ${username},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: white; padding: 10px; border-radius: 4px; font-size: 12px;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
              <p>Happy spelling!<br>The Spelling Champions Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Champions. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendContactEmail(
  name: string,
  email: string,
  message: string,
  toEmail: string
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  
  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: email,
    subject: `Spelling Champions - Feedback from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .message-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #4f46e5; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Spelling Champions - Contact Form</h1>
            </div>
            <div class="content">
              <h2>New Message Received</h2>
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Message:</strong></p>
              <div class="message-box">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            <div class="footer">
              <p>This message was sent via the Spelling Champions Help form.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendEmailUpdateNotification(
  toEmail: string, 
  username: string
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  
  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: 'Spelling Champions - Email Address Updated',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Spelling Champions</h1>
            </div>
            <div class="content">
              <h2>Email Address Updated</h2>
              <p>Hi ${username},</p>
              <p>Your email address has been successfully updated to <strong>${toEmail}</strong>.</p>
              <p>You can now use this email address for password resets and account recovery.</p>
              <p>If you didn't make this change, please contact support immediately.</p>
              <p>Happy spelling!<br>The Spelling Champions Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Champions. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
