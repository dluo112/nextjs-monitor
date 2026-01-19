import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail({ to, subject, text }: EmailOptions) {
  const sender = process.env.EMAIL_SENDER;
  const authCode = process.env.EMAIL_AUTH_CODE;

  if (!sender || !authCode) {
    console.warn("Email configuration missing (EMAIL_SENDER or EMAIL_AUTH_CODE). Skipping email.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: sender,
      pass: authCode,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"AutoDL Monitor" <${sender}>`,
      to,
      subject,
      text,
    });
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
