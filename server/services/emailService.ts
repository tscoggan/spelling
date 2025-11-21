import { Resend } from 'resend';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return {apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email};
}

async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail || 'onboarding@resend.dev'
  };
}

export async function sendPasswordResetEmail(
  toEmail: string, 
  username: string, 
  resetToken: string
): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();
  
  const resetUrl = `${process.env.REPL_SLUG ? 
    `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/reset-password?token=${resetToken}` :
    `http://localhost:5000/reset-password?token=${resetToken}`}`;

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

export async function sendEmailUpdateNotification(
  toEmail: string, 
  username: string
): Promise<void> {
  const { client, fromEmail } = await getUncachableResendClient();
  
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
