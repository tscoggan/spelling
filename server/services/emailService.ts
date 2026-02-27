import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not found in environment variables');
  }
  
  return {
    client: new Resend(apiKey),
    fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
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

export async function sendFlaggedContentNotification(
  adminEmails: string[],
  word: string,
  flaggedContentTypes: string[],
  gameMode: string,
  comments: string | null
): Promise<void> {
  if (adminEmails.length === 0) {
    console.log('No admin emails to notify about flagged content');
    return;
  }

  const { client, fromEmail } = getResendClient();
  
  const domain = process.env.REPLIT_DOMAINS || 'localhost:5000';
  const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
  const adminUrl = `${protocol}://${domain}/admin`;

  const contentTypesList = flaggedContentTypes.map(type => `<li>${type}</li>`).join('');

  await client.emails.send({
    from: fromEmail,
    to: adminEmails,
    subject: `Spelling Champions - Content Flagged: "${word}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #ef4444; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Content Flagged</h1>
            </div>
            <div class="content">
              <h2>A user has flagged content for review</h2>
              <div class="alert-box">
                <p><strong>Word:</strong> ${word}</p>
                <p><strong>Game Mode:</strong> ${gameMode}</p>
                <p><strong>Flagged Content Types:</strong></p>
                <ul>${contentTypesList}</ul>
                ${comments ? `<p><strong>User Comment:</strong> ${comments}</p>` : ''}
              </div>
              <p>Please review this content in the Admin Dashboard:</p>
              <p style="text-align: center;">
                <a href="${adminUrl}" class="button">Go to Admin Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Champions.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPromoCodeEmail(
  toEmails: string[],
  promoCode: {
    code: string;
    discountPercent: number;
    codeType: string;
    expiresAt: string | null;
  }
): Promise<void> {
  const { client, fromEmail } = getResendClient();

  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
  const signupUrl = `${protocol}://${domain}/family/signup`;

  const expiryNote = promoCode.expiresAt
    ? `<p style="color:#888;font-size:13px;">This code expires on <strong>${new Date(promoCode.expiresAt).toLocaleDateString()}</strong>.</p>`
    : '';

  const typeNote = promoCode.codeType === 'one_time'
    ? 'This is a one-time use code — it can only be applied once.'
    : 'This code can be used multiple times.';

  await client.emails.send({
    from: fromEmail,
    to: toEmails,
    subject: `You have a Spelling Playground promo code — ${promoCode.discountPercent}% off!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .code-box { background: white; border: 2px dashed #4f46e5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #4f46e5; }
            .discount { font-size: 20px; font-weight: bold; color: #16a34a; margin-top: 8px; }
            .button { display: inline-block; padding: 14px 36px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 20px 0; }
            .steps { background: white; border-radius: 6px; padding: 16px 20px; margin: 16px 0; }
            .steps ol { margin: 8px 0; padding-left: 20px; }
            .steps li { margin: 6px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Spelling Playground</h1>
            </div>
            <div class="content">
              <h2>You have a special discount!</h2>
              <p>Here is your exclusive promo code for a Spelling Playground Family account:</p>

              <div class="code-box">
                <div class="code">${promoCode.code}</div>
                <div class="discount">${promoCode.discountPercent}% off your subscription</div>
              </div>

              ${expiryNote}
              <p style="color:#555;font-size:13px;">${typeNote}</p>

              <p style="text-align:center;">
                <a href="${signupUrl}" class="button">Create Your Account</a>
              </p>

              <div class="steps">
                <strong>How to apply your code:</strong>
                <ol>
                  <li>Click the button above (or go to <a href="${signupUrl}">${signupUrl}</a>)</li>
                  <li>Fill in your account details on Step 1</li>
                  <li>On Step 2, enter your promo code: <strong>${promoCode.code}</strong></li>
                  <li>Your discount will be applied automatically at checkout</li>
                </ol>
              </div>

              <p>Spelling Playground is a fun, interactive spelling game for kids featuring word lists, games, leaderboards, and more.</p>
              <p>Happy spelling!</p>
            </div>
            <div class="footer">
              <p>This email was sent by an administrator of Spelling Playground.<br>If you did not expect this email, you can safely ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendAccountDeletionEmail(
  toEmail: string,
  username: string,
  deletedUsers: { username: string; firstName?: string | null; lastName?: string | null }[],
  isEntireGroup: boolean,
  groupType: 'family' | 'school' | 'individual'
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  
  const deletedUsersList = deletedUsers.map(u => {
    const name = u.firstName || u.lastName 
      ? `${u.firstName || ''} ${u.lastName || ''}`.trim() 
      : u.username;
    return `<li>${name} (${u.username})</li>`;
  }).join('');
  
  const groupLabel = groupType === 'family' ? 'family' : groupType === 'school' ? 'school' : 'account';
  const subject = isEntireGroup 
    ? `Spelling Champions - ${groupType === 'family' ? 'Family' : 'School'} Account Deleted`
    : 'Spelling Champions - Account Deleted';
  
  const headerText = isEntireGroup
    ? `Your ${groupLabel} account has been deleted`
    : 'An account has been deleted';

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject,
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
            .deleted-list { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Spelling Champions</h1>
            </div>
            <div class="content">
              <h2>${headerText}</h2>
              <p>Hi ${username},</p>
              <p>This is a confirmation that the following account${deletedUsers.length > 1 ? 's have' : ' has'} been permanently deleted from Spelling Champions:</p>
              <div class="deleted-list">
                <ul>
                  ${deletedUsersList}
                </ul>
              </div>
              <p>All associated data including game sessions, scores, word lists, and achievements have been removed.</p>
              <p>If you did not authorize this action, please contact support immediately.</p>
              <p>Thank you for using Spelling Champions.</p>
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
