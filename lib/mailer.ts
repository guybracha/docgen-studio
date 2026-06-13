import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendResetEmail(to: string, resetUrl: string) {
  // If no SMTP configured, log the link (dev mode)
  if (!process.env.SMTP_USER) {
    console.log(`\n[DEV] Password reset link for ${to}:\n${resetUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"DocGen Studio" <${process.env.SMTP_USER}>`,
    to,
    subject: "איפוס סיסמה — DocGen Studio",
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1e40af;">איפוס סיסמה</h2>
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך. לחץ על הכפתור כדי להמשיך:</p>
        <a href="${resetUrl}" style="display:inline-block; background:#2563eb; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold; margin: 16px 0;">
          איפוס סיסמה
        </a>
        <p style="color:#6b7280; font-size:14px;">הקישור תקף ל-60 דקות. אם לא ביקשת איפוס, התעלם מהודעה זו.</p>
      </div>
    `,
  });
}
