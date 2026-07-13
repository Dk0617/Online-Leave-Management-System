import nodemailer from "nodemailer";

// If EMAIL_USER/EMAIL_PASS aren't set in .env, we can't actually send mail —
// fall back to printing the code in the backend terminal so local dev/testing
// still works without any email setup. Set both env vars (a Gmail address +
// an "App Password" from Google Account > Security > App Passwords) to send
// real emails.
const transporter =
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        service: "gmail",
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
