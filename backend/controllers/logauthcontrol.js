import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { ROLE_MODELS } from "../utils/roleModels.js";
import Notification from "../models/Notification.js";
import OtpCode from "../models/OtpCode.js";
import { writeAudit } from "../utils/audit.js";
import { sendOtpEmail } from "../utils/mailer.js";

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function signToken(user, role) {
  return jwt.sign({ id: user._id, role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
}

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  // Every login checks all 7 role collections for this username — done in
  // parallel (same first-match order as before) instead of one at a time,
  // since this runs on every single login attempt in the whole system.
  const matches = await Promise.all(
    Object.entries(ROLE_MODELS).map(async ([role, Model]) => {
      const user = await Model.findOne({ username });
      return user ? { role, user } : null;
    })
  );
  const found = matches.find(Boolean);
  if (!found) {
    return res.status(401).json({ message: "Invalid username or password" });
  }
  const { role, user } = found;

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    await writeAudit(role, username, "login_failed", "");
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = signToken(user, role);

  const { password: _pw, ...safeUser } = user.toObject();
  await writeAudit(role, username, "login_success", "");
  return res.json({
    token,
    user: { ...safeUser, role, mustChangePassword: !!user.mustChangePassword },
  });
};

// Shared by every role — looks up the caller's own model via their token.
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Current and new password are required" });
  }
  if (newPassword.length < 4) {
    return res
      .status(400)
      .json({ message: "New password must be at least 4 characters" });
  }
  if (newPassword === currentPassword) {
    return res
      .status(400)
      .json({ message: "New password must be different from current password" });
  }

  const Model = ROLE_MODELS[req.user.role];
  const user = await Model.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  await Notification.create({
    role: req.user.role,
    username: user.username,
    name: user.name,
  });
  await writeAudit(req.user.role, user.username, "password_changed", "");

  res.json({ message: "Password updated" });
};

// ── Email-code (passwordless) login ────────────────────────────────
// Admin sets an email on an actor's account; that actor can then request a
// 6-digit code sent to it and log in without a password. The code is
// hashed at rest and expires after 10 minutes.
export const requestOtp = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ message: "Email is required" });

  const matches = await Promise.all(
    Object.entries(ROLE_MODELS).map(async ([role, Model]) => {
      const user = await Model.findOne({ email });
      return user ? { role, user } : null;
    })
  );
  const found = matches.find(Boolean);
  if (!found) {
    return res.status(404).json({ message: "No account is registered with that email." });
  }
  const { role, user } = found;

  const code = generateOtp();
  const codeHash = await bcrypt.hash(code, 10);
  await OtpCode.create({
    email,
    codeHash,
    role,
    userId: user._id,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  await sendOtpEmail(email, code);
  await writeAudit(role, user.username, "otp_requested", "");
  res.json({ message: "A login code has been sent to your email." });
};

export const verifyOtp = async (req, res) => {
  const email = (req.body.email || "").trim().toLowerCase();
  const code = (req.body.code || "").trim();
  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  const otp = await OtpCode.findOne({ email }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) {
    return res.status(401).json({ message: "Invalid or expired code. Please request a new one." });
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many attempts. Please request a new code." });
  }

  const isMatch = await bcrypt.compare(code, otp.codeHash);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    return res.status(401).json({ message: "Invalid or expired code. Please request a new one." });
  }

  const Model = ROLE_MODELS[otp.role];
  const user = Model && (await Model.findById(otp.userId));
  if (!user) {
    return res.status(404).json({ message: "Account no longer exists" });
  }

  await OtpCode.deleteMany({ email });

  const token = signToken(user, otp.role);
  const { password: _pw, ...safeUser } = user.toObject();
  await writeAudit(otp.role, user.username, "login_success_otp", "");
  res.json({
    token,
    user: { ...safeUser, role: otp.role, mustChangePassword: !!user.mustChangePassword },
  });
};
