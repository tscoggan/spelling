import { Resend } from 'resend';

export async function sendEmailVerificationCode(
  toEmail: string,
  firstName: string | null,
  code: string
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  const name = firstName || "there";
  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: "Verify Your Email - Spelling Playground",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2 style="margin-top:0;">Verify Your Email</h2>
              <p>Hi ${name},</p>
              <p>To complete your Spelling Playground family account setup, please enter the following verification code:</p>
              <div style="text-align:center;margin:24px 0;">
                <span style="display:inline-block;font-size:36px;font-weight:bold;letter-spacing:8px;color:#4f46e5;background:#f0f0ff;padding:12px 24px;border-radius:8px;">${code}</span>
              </div>
              <p style="color:#666;font-size:14px;">This code expires in 10 minutes. If you did not create a Spelling Playground account, you can safely ignore this email.</p>
              <p>Happy spelling!<br>The Spelling Playground Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Playground. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

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

function getAppDomain() {
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const protocol = process.env.REPLIT_DOMAINS ? 'https' : 'http';
  return `${protocol}://${domain}`;
}

function emailHeader(bgColor = 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #8b00ff)') {
  const logoUrl = `${getAppDomain()}/images/spelling-playground-title.png`;
  return `
    <div style="background: ${bgColor}; padding: 20px 30px; text-align: center; border-radius: 8px 8px 0 0;">
      <img src="${logoUrl}" alt="Spelling Playground" width="260" style="display: block; margin: 0 auto; max-width: 100%; height: auto;" />
    </div>
  `;
}

export async function sendPasswordResetEmail(
  toEmail: string, 
  username: string, 
  resetToken: string
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  const baseUrl = getAppDomain();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: 'Spelling Playground - Password Reset',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
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
              <p>Happy spelling!<br>The Spelling Playground Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Playground. Please do not reply to this email.</p>
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
    subject: `Spelling Playground - Feedback from ${name}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .message-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #4f46e5; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
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
              <p>This message was sent via the Spelling Playground Help form.</p>
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
    subject: 'Spelling Playground - Email Address Updated',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2>Email Address Updated</h2>
              <p>Hi ${username},</p>
              <p>Your email address has been successfully updated to <strong>${toEmail}</strong>.</p>
              <p>You can now use this email address for password resets and account recovery.</p>
              <p>If you didn't make this change, please contact support immediately.</p>
              <p>Happy spelling!<br>The Spelling Playground Team</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Playground. Please do not reply to this email.</p>
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
  const baseUrl = getAppDomain();
  const adminUrl = `${baseUrl}/admin`;

  const contentTypesList = flaggedContentTypes.map(type => `<li>${type}</li>`).join('');

  await client.emails.send({
    from: fromEmail,
    to: adminEmails,
    subject: `Spelling Playground - Content Flagged: "${word}"`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .alert-box { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2 style="color: #ef4444;">Content Flagged for Review</h2>
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
              <p>This is an automated message from Spelling Playground.</p>
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
    applicablePlans: string;
  }
): Promise<void> {
  const { client, fromEmail } = getResendClient();

  const baseUrl = getAppDomain();
  const signupUrl = `${baseUrl}/family/signup?promo=${encodeURIComponent(promoCode.code)}`;

  const expiryNote = promoCode.expiresAt
    ? `<p style="color:#888;font-size:13px;">This code expires on <strong>${new Date(promoCode.expiresAt).toLocaleDateString()}</strong>.</p>`
    : '';

  const typeNote = promoCode.codeType === 'one_time'
    ? 'This is a one-time use code — it can only be applied once.'
    : 'This code can be used multiple times.';

  const plansLabel =
    promoCode.applicablePlans === 'monthly' ? 'Monthly plan only' :
    promoCode.applicablePlans === 'annual'  ? 'Annual plan only' :
                                              'Monthly and Annual plans';
  const plansNote = `<p style="color:#555;font-size:13px;">Applies to: <strong>${plansLabel}</strong></p>`;

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
            ${emailHeader()}
            <div class="content">
              <h2>You have a special discount!</h2>
              <p>Here is your exclusive promo code for a Spelling Playground Family account:</p>

              <div class="code-box">
                <div class="code">${promoCode.code}</div>
                <div class="discount">${promoCode.discountPercent}% off your subscription</div>
              </div>

              ${expiryNote}
              <p style="color:#555;font-size:13px;">${typeNote}</p>
              ${plansNote}

              <p style="text-align:center;">
                <a href="${signupUrl}" class="button">Create Your Account</a>
              </p>

              <div class="steps">
                <strong>How to redeem:</strong>
                <ol>
                  <li>Click the button above — your code will be applied automatically</li>
                  <li>Fill in your account details and click Continue to Payment</li>
                  <li>Your discount will already be applied on the payment screen</li>
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
    ? `Spelling Playground - ${groupType === 'family' ? 'Family' : 'School'} Account Deleted`
    : 'Spelling Playground - Account Deleted';
  
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
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .deleted-list { background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #ef4444; margin: 15px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2>${headerText}</h2>
              <p>Hi ${username},</p>
              <p>This is a confirmation that the following account${deletedUsers.length > 1 ? 's have' : ' has'} been permanently deleted from Spelling Playground:</p>
              <div class="deleted-list">
                <ul>
                  ${deletedUsersList}
                </ul>
              </div>
              <p>All associated data including game sessions, scores, word lists, and achievements have been removed.</p>
              <p>If you did not authorize this action, please contact support immediately.</p>
              <p>Thank you for using Spelling Playground.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from Spelling Playground. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendPaymentReceiptEmail(
  toEmail: string,
  details: {
    username: string;
    firstName: string | null;
    amountCents: number;
    description: string;
    planType: "monthly" | "annual" | "school_verification";
    expiresAt: Date;
    paymentDate: Date;
  }
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  const baseUrl = getAppDomain();

  const displayName = details.firstName || details.username;
  const amountDollars = (details.amountCents / 100).toFixed(2);
  const paymentDateStr = details.paymentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const expiresDateStr = details.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const planLabel =
    details.planType === 'monthly' ? 'Family — Monthly Plan' :
    details.planType === 'annual'  ? 'Family — Annual Plan' :
                                     'School — Adult Verification';

  const renewalNote =
    details.planType === 'monthly'
      ? 'Your subscription renews monthly. You can manage it anytime from your account.'
      : details.planType === 'annual'
      ? 'Your subscription renews annually. You can manage it anytime from your account.'
      : 'Your school account is now active for one year.';

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `Your Spelling Playground receipt — $${amountDollars}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; }
            .receipt-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { color: #111; text-align: right; }
            .amount { color: #16a34a; font-size: 32px; font-weight: bold; text-align: center; margin: 12px 0 4px; }
            .plan-badge { display: inline-block; background: #4f46e5; color: white; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: bold; margin-bottom: 16px; }
            .button { display: inline-block; padding: 12px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2 style="margin-top:0;">Thanks, ${displayName}!</h2>
              <p>Your payment was successful. Here is your receipt.</p>

              <div class="receipt-box">
                <div style="text-align:center;">
                  <div class="amount">$${amountDollars}</div>
                  <div><span class="plan-badge">${planLabel}</span></div>
                </div>

                <div class="receipt-row">
                  <span class="label">Date</span>
                  <span class="value">${paymentDateStr}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Description</span>
                  <span class="value">${details.description}</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Payment method</span>
                  <span class="value">Card (Stripe)</span>
                </div>
                <div class="receipt-row">
                  <span class="label">Access expires</span>
                  <span class="value">${expiresDateStr}</span>
                </div>
              </div>

              <p style="color:#555;font-size:14px;">${renewalNote}</p>

              <p style="text-align:center;">
                <a href="${baseUrl}/" class="button">Go to Spelling Playground</a>
              </p>
            </div>
            <div class="footer">
              <p>This receipt was generated automatically. Please keep it for your records.<br>
              Questions? Contact us at <a href="mailto:support@spellingplayground.com" style="color:#4f46e5;">support@spellingplayground.com</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}

export async function sendRenewalReminderEmail(
  toEmail: string,
  details: {
    username: string;
    firstName: string | null;
    amountCents: number;
    planType: "monthly" | "annual";
    renewsAt: Date;
  }
): Promise<void> {
  const { client, fromEmail } = getResendClient();
  const baseUrl = getAppDomain();

  const displayName = details.firstName || details.username;
  const amountDollars = (details.amountCents / 100).toFixed(2);
  const renewsAtStr = details.renewsAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const planLabel = details.planType === 'monthly' ? 'Monthly Plan' : 'Annual Plan';
  const interval = details.planType === 'monthly' ? 'month' : 'year';

  await client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `Your Spelling Playground subscription renews in 2 days`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 15px; }
            .info-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { color: #111; text-align: right; }
            .amount { color: #4f46e5; font-size: 28px; font-weight: bold; text-align: center; margin: 12px 0 4px; }
            .plan-badge { display: inline-block; background: #4f46e5; color: white; border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: bold; margin-bottom: 16px; }
            .button { display: inline-block; padding: 12px 32px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; margin: 20px 0; }
            .manage-link { color: #4f46e5; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            ${emailHeader()}
            <div class="content">
              <h2 style="margin-top:0;">Hi ${displayName}, your subscription renews soon</h2>
              <p>Just a heads up — your Spelling Playground subscription will renew automatically in <strong>2 days</strong>.</p>

              <div class="info-box">
                <div style="text-align:center;">
                  <div class="amount">$${amountDollars}</div>
                  <div><span class="plan-badge">Family — ${planLabel}</span></div>
                </div>
                <div class="info-row">
                  <span class="label">Renewal date</span>
                  <span class="value">${renewsAtStr}</span>
                </div>
                <div class="info-row">
                  <span class="label">Billed</span>
                  <span class="value">Every ${interval} via Stripe</span>
                </div>
              </div>

              <p style="color:#555;font-size:14px;">
                No action needed — your subscription will renew automatically and your family keeps their full access.
                If you'd like to turn off auto-renewal, you can do so from <a href="${baseUrl}/" class="manage-link">your account settings</a> before the renewal date.
              </p>

              <p style="text-align:center;">
                <a href="${baseUrl}/" class="button">Manage My Account</a>
              </p>
            </div>
            <div class="footer">
              <p>You're receiving this because you have an active Spelling Playground subscription.<br>
              Questions? Contact us at <a href="mailto:support@spellingplayground.com" style="color:#4f46e5;">support@spellingplayground.com</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  });
}
