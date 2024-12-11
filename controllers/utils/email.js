import nodemailer from 'nodemailer';

// Function to send an email
export const sendEmail = async (to, subject, resetLink) => {
  try {
    // Create reusable transporter object using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    
      // Email template
   const emailTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #0A192F;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }
    .email-container {
      max-width: 600px;
      margin: 30px auto;
      background: #112240;
      border-radius: 12px;
      box-shadow: 0 15px 35px rgba(5, 16, 35, 0.4);
      overflow: hidden;
      border: 1px solid #1D3557;
    }
    .header {
      background: linear-gradient(135deg, #5CDB95 0%, #379683 100%);
      color: #0A192F;
      padding: 25px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 30px 20px;
      color: #8892B0;
    }
    .content p {
      margin: 0 0 20px;
      font-size: 16px;
    }
    .reset-button {
      display: inline-block;
      margin: 20px 0;
      padding: 15px 25px;
      background: linear-gradient(135deg, #5CDB95 0%, #379683 100%);
      color: #0A192F;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      transition: transform 0.2s ease;
    }
    .reset-button:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(92, 219, 149, 0.4);
    }
    .footer {
      background-color: #0A192F;
      text-align: center;
      padding: 15px;
      font-size: 12px;
      color: #64FFDA;
      border-top: 1px solid #1D3557;
    }
    @media screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        width: 100%;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>Reset Your Password</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We noticed you're having trouble accessing your account. No worries! Just click the button below to securely reset your password:</p>
      <a href="${resetLink}" class="reset-button" target="_blank">Reset Password</a>
       <p>This link will expire in 1 hour for your security. If you didn't request this reset, please contact our support team immediately.</p>
      <p>Stay secure,<br>Your Chat App Team</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Chat App. All rights reserved. | Secure Password Reset</p>
    </div>
  </div>
</body>
</html>`
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: emailTemplate,
    });

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};
