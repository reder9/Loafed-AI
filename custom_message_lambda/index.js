// Loafed AI - AWS Cognito Custom Message Lambda Trigger
// Stylized responsive HTML email notifications for Baker authentication

exports.handler = async (event) => {
  console.log('CustomMessage triggerSource:', event.triggerSource);
  console.log('User attributes:', JSON.stringify(event.request.userAttributes || {}));

  const code = event.request.codeParameter || '{####}';
  const logoUrl = 'https://loafed.redersoft.com/static/logo.png';
  const websiteUrl = 'https://loafed.redersoft.com';

  let subject = 'Loafed AI -- Your Baker Verification Code';
  let title = 'Welcome to the Feline Bakery';
  let badgeText = 'BAKER VERIFICATION';
  let introParagraph = 'Thank you for joining Loafed AI, the Feline Posture &amp; Silhouette Certification Bureau. Enter the 6-digit verification code below to verify your email and activate your Baker profile:';
  let codeLabel = 'YOUR 6-DIGIT VERIFICATION CODE';
  let reasonText = 'This code is required to confirm your email address and enable official leaderboard loaf submissions.';

  if (event.triggerSource === 'CustomMessage_ResendCode') {
    subject = 'Loafed AI -- Your New Verification Code';
    title = 'New Verification Code';
    badgeText = 'CODE RESEND';
    introParagraph = 'We received a request to resend your verification code for Loafed AI. Enter the 6-digit code below to complete your email verification:';
    codeLabel = 'UPDATED VERIFICATION CODE';
    reasonText = 'Enter this new code on the verification screen to activate your Baker account.';
  } else if (event.triggerSource === 'CustomMessage_ForgotPassword') {
    subject = 'Loafed AI -- Password Reset Code';
    title = 'Reset Your Password';
    badgeText = 'ACCOUNT SECURITY';
    introParagraph = 'We received a request to reset the password for your Loafed AI Baker account. Enter the 6-digit code below to proceed with setting a new password:';
    codeLabel = 'PASSWORD RESET CODE';
    reasonText = 'If you did not request a password reset, you can safely ignore this email. Your current password remains secure.';
  } else if (event.triggerSource === 'CustomMessage_UpdateUserAttribute' || event.triggerSource === 'CustomMessage_VerifyUserAttribute') {
    subject = 'Loafed AI -- Confirm Email Change';
    title = 'Verify Updated Email';
    badgeText = 'EMAIL UPDATE';
    introParagraph = 'Please enter the verification code below to confirm your updated email address for your Loafed AI account:';
    codeLabel = 'EMAIL VERIFICATION CODE';
    reasonText = 'This confirms your ownership of the updated email address for Loafed AI.';
  }

  // Generate responsive email-client compatible HTML
  const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 520px) {
      .outer-wrapper {
        padding: 16px 8px 32px 8px !important;
      }
      .main-card {
        border-radius: 16px !important;
      }
      .card-content {
        padding: 22px 18px 20px 18px !important;
      }
      .header-table {
        margin-bottom: 20px !important;
        padding-bottom: 16px !important;
      }
      .header-left-col {
        display: block !important;
        width: 100% !important;
      }
      .header-badge-col {
        display: block !important;
        width: 100% !important;
        text-align: left !important;
        padding-top: 10px !important;
      }
      .brand-title {
        font-size: 20px !important;
      }
      .brand-sub {
        font-size: 10.5px !important;
        line-height: 1.35 !important;
      }
      .heading-title {
        font-size: 20px !important;
      }
      .code-box-td {
        padding: 20px 12px !important;
      }
      .code-number {
        font-size: 32px !important;
        letter-spacing: 6px !important;
        padding-left: 6px !important;
      }
      .footer-td {
        padding: 18px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fffaf4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #292524; -webkit-font-smoothing: antialiased;">
  <!-- Pre-header text (hidden preview in inbox) -->
  <div style="display: none; font-size: 1px; color: #fffaf4; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    Your Loafed AI verification code is ${code}. Enter this code to verify your Baker account.
  </div>

  <table width="100%" border="0" cellspacing="0" cellpadding="0" class="outer-wrapper" style="background-color: #fffaf4; padding: 36px 16px 48px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="max-width: 580px; background-color: #ffffff; border: 1px solid #fed7aa; border-radius: 20px; box-shadow: 0 10px 30px -10px rgba(234, 88, 12, 0.12); overflow: hidden;">
          
          <!-- Top Orange/Amber Accent Line -->
          <tr>
            <td height="5" style="background: linear-gradient(90deg, #ea580c 0%, #f97316 50%, #d97706 100%);"></td>
          </tr>
          
          <!-- Content Padding -->
          <tr>
            <td class="card-content" style="padding: 36px 32px 28px 32px;">
              
              <!-- Brand Header -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" class="header-table" style="margin-bottom: 28px; border-bottom: 1px solid #ffedd5; padding-bottom: 22px;">
                <tr>
                  <td valign="middle" class="header-left-col">
                    <table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="52" valign="middle" style="padding-right: 12px;">
                          <a href="${websiteUrl}" target="_blank" style="text-decoration: none; display: block;">
                            <img src="${logoUrl}" alt="Loafed AI Mascot" width="48" height="48" class="logo-img" style="display: block; width: 48px; height: 48px; border-radius: 12px; border: 1.5px solid #fed7aa; background-color: #fff7ed; object-fit: contain;" />
                          </a>
                        </td>
                        <td valign="middle">
                          <div class="brand-title" style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1c1917; line-height: 1.2;">
                            Loafed<span style="color: #ea580c;">AI</span>
                          </div>
                          <div class="brand-sub" style="font-size: 11px; color: #9a3412; letter-spacing: 0.5px; font-weight: 700; margin-top: 3px; line-height: 1.3;">
                            Feline Posture &amp; Silhouette Certification Bureau
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle" class="header-badge-col">
                    <span style="display: inline-block; padding: 5px 12px; background-color: #ffedd5; border: 1px solid #fed7aa; border-radius: 999px; font-size: 10px; font-weight: 800; color: #9a3412; letter-spacing: 0.8px; text-transform: uppercase; white-space: nowrap;">
                      ${badgeText}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Main Greeting & Description -->
              <h1 class="heading-title" style="color: #1c1917; font-size: 22px; font-weight: 900; margin: 0 0 12px 0; line-height: 1.3; letter-spacing: -0.3px;">
                ${title}
              </h1>
              <p style="color: #57534e; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                ${introParagraph}
              </p>

              <!-- Stylized Code Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 16px; margin: 24px 0;">
                <tr>
                  <td align="center" class="code-box-td" style="padding: 24px 20px;">
                    <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; color: #9a3412; text-transform: uppercase; margin-bottom: 8px;">
                      ${codeLabel}
                    </div>
                    <div class="code-number" style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #c2410c; font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, Courier, monospace; line-height: 1.2; padding-left: 12px;">
                      ${code}
                    </div>
                    <div style="font-size: 12px; font-weight: 600; color: #78716c; margin-top: 10px;">
                      Valid for 15 minutes &bull; Single-use security code
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #78716c; font-size: 13px; line-height: 1.6; margin: 0 0 24px 0;">
                ${reasonText}
              </p>

              <!-- Safety Notice Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px; font-size: 12px; color: #78716c; line-height: 1.5;">
                    <strong style="color: #292524;">Security Note:</strong> Never share this verification code with anyone. Loafed AI will never ask for your code outside of the official sign-in verification screen.
                  </td>
                </tr>
              </table>

              <!-- Quick Links Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
                <tr>
                  <td align="center">
                    <a href="${websiteUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; border-radius: 12px; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.25);">
                      Open Loafed AI
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td class="footer-td" style="background-color: #fafaf9; border-top: 1px solid #f5f5f4; padding: 22px 32px; text-align: center;">
              <p style="font-size: 11px; color: #78716c; line-height: 1.6; margin: 0 0 8px 0;">
                <strong>Loafed AI</strong> &bull; An open feline posture appreciation project by <a href="https://redersoft.com" target="_blank" style="color: #ea580c; text-decoration: none; font-weight: 700;">RederSoft</a>
              </p>
              <p style="font-size: 11px; color: #a8a29e; line-height: 1.5; margin: 0;">
                <a href="${websiteUrl}/leaderboard" target="_blank" style="color: #78716c; text-decoration: underline;">Leaderboard</a> &bull;
                <a href="${websiteUrl}" target="_blank" style="color: #78716c; text-decoration: underline;">Audit Loaf</a> &bull;
                <a href="https://redersoft.com" target="_blank" style="color: #78716c; text-decoration: underline;">RederSoft</a>
              </p>
              <p style="font-size: 10px; color: #a8a29e; margin: 8px 0 0 0;">
                &copy; 2026 RederSoft. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  event.response.emailSubject = subject;
  event.response.emailMessage = emailHtml;

  return event;
};
