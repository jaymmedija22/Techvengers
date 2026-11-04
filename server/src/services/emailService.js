
const nodemailer = require("nodemailer");

// Create an SMTP transporter using environment variables.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send a password reset email.
const sendPasswordResetEmail = async (email, token) => {
  const clientOrigin = process.env.CLIENT_ORIGIN;

  if (!clientOrigin) {
    throw new Error("CLIENT_ORIGIN is not configured.");
  }

  const resetUrl = `${clientOrigin}/reset-password?token=${encodeURIComponent(token)}`;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "HOPE ERP - Password Reset Request",
    text: `
Hello,

We received a request to reset your HOPE ERP account password.

Use the following link to reset your password:

${resetUrl}

This link will expire in 30 minutes and can only be used once.

If you did not request a password reset, you can ignore this email.

HOPE ERP Team
    `,
    html: `
      <h2>HOPE ERP Password Reset</h2>
      <p>We received a request to reset your account password.</p>
      <p><a href="${resetUrl}">Reset My Password</a></p>
      <p>This link expires in 30 minutes and can only be used once.</p>
      <p>If you did not request this, you can ignore this email.</p>
      <p>HOPE ERP Team</p>
    `,
  });

  if (!info.accepted || info.accepted.length === 0 || info.rejected?.length > 0) {
    throw new Error("Password reset email was not accepted by the mail server.");
  }

  console.log("Password reset email accepted:", {
    messageId: info.messageId,
    acceptedCount: info.accepted.length,
    rejectedCount: info.rejected?.length || 0,
    response: info.response,
  });
};

// Send an account setup email.
const sendAccountSetupEmail = async (email, token) => {
  const clientOrigin = process.env.CLIENT_ORIGIN;

  if (!clientOrigin) {
    throw new Error("CLIENT_ORIGIN is not configured.");
  }

  const setupUrl = `${clientOrigin}/set-password?token=${encodeURIComponent(token)}`;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "HOPE ERP - Set Up Your Account",
    text: `Welcome to HOPE ERP!

Your account has been created. Please use the link below to set your password:

${setupUrl}

This link expires in 30 minutes. If you did not expect this email, please contact your administrator.`,
    html: `
      <h2>Welcome to HOPE ERP!</h2>
      <p>Your account has been created.</p>
      <p>Click the link below to set your password:</p>
      <p><a href="${setupUrl}">Set Up Your Password</a></p>
      <p>This link expires in 30 minutes.</p>
      <p>If you did not expect this email, please contact your administrator.</p>
    `,
  });

  if (!info.accepted || info.accepted.length === 0 || info.rejected?.length > 0) {
    throw new Error("Account setup email was not accepted by the mail server.");
  }

  console.log("Account setup email accepted:", {
    messageId: info.messageId,
    acceptedCount: info.accepted.length,
    rejectedCount: info.rejected?.length || 0,
    response: info.response,
  });
};

module.exports = {
  sendPasswordResetEmail,
  sendAccountSetupEmail,
};
