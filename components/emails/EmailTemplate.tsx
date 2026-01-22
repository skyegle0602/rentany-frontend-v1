"use client";


// This is a helper file for creating professional HTML emails
// You can import and use these templates throughout your app

export const createEmailTemplate = ({ title, content, buttonText, buttonUrl, footerText }) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                Rentany
              </h1>
              <p style="margin: 8px 0 0 0; color: #cbd5e1; font-size: 14px;">
                Rent Anything, From Anyone
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 22px; font-weight: 600;">
                ${title}
              </h2>
              ${content}
            </td>
          </tr>
          
          <!-- Button (if provided) -->
          ${buttonText && buttonUrl ? `
          <tr>
            <td style="padding: 0 30px 40px 30px; text-align: center;">
              <a href="${buttonUrl}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                ${buttonText}
              </a>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px;">
                ${footerText || 'Thank you for using Rentany!'}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated message, please do not reply to this email.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Helper for creating info boxes
export const createInfoBox = ({ title, items, highlight = false }) => {
  const bgColor = highlight ? '#fef3c7' : '#f1f5f9';
  const borderColor = highlight ? '#fbbf24' : '#cbd5e1';
  
  return `
    <div style="background-color: ${bgColor}; border-left: 4px solid ${borderColor}; padding: 20px; margin: 20px 0; border-radius: 8px;">
      <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 16px; font-weight: 600;">
        ${title}
      </h3>
      ${items.map(item => `
        <p style="margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.6;">
          <strong style="color: #1e293b;">${item.label}:</strong> ${item.value}
        </p>
      `).join('')}
    </div>
  `;
};
