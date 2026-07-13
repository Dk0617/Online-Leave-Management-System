import nodemailer from "nodemailer";

// If EMAIL_USER/EMAIL_PASS aren't set in .env, we can't actually send mail —
// fall back to printing the code in the backend terminal so local dev/testing
// still works without any email setup. Set both env vars (the KDU email
// address on Microsoft 365/Outlook + its account password, or an app
// password if the account has MFA/modern-auth app passwords enabled) to
// send real emails via KDU's own mail server.
const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        host: "smtp.office365.com",
        port: 587,
        secure: false, // STARTTLS on port 587
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      })
    : null;

async function sendMail(to, subject, text) {
  if (!transporter) {
    console.log(`[MAIL] Email not configured — would send to ${to}: "${subject}" — ${text}`);
    return;
  }
  await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text });
}

export async function sendOtpEmail(to, code) {
  await sendMail(
    to,
    "OLMS Login Code",
    `Your OLMS login code is ${code}. It expires in 10 minutes. If you didn't request this, ignore this email.`
  );
}

export async function sendApprovalEmail(to, studentName, leave) {
  await sendMail(
    to,
    "Your OLMS Leave Pass is Fully Approved",
    `Hi ${studentName},\n\n` +
      `Your ${leave.type} leave request (${leave.startDate} to ${leave.endDate}) has been fully approved.\n\n` +
      `Log in to OLMS and download your official Leave Pass PDF before you exit campus.\n\n` +
      `— OLMS, KDU Southern Campus`
  );
}
