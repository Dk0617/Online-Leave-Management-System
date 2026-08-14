import jwt from "jsonwebtoken";
import { ROLE_MODELS } from "../utils/roleModels.js";
import Notification from "../models/Notification.js";
import { writeAudit } from "../utils/audit.js";

// A self-chosen password (via Change Password, typically the forced change
// on first login) is held to a real bar since the account holder picks and
// remembers it themselves — at least 8 characters with at least one
// uppercase letter. Deliberately lighter than admincontrol.js's staff
// password policy (no digit/symbol requirement needed here): this is meant
// to be a low-friction step up from an admin-issued starter password, not a
// second wall to get through.
const SELF_SET_PASSWORD_MESSAGE =
  "New password must be at least 8 characters long and contain at least one uppercase letter.";
function isValidSelfSetPassword(password) {
  return typeof password === "string" && password.length >= 8 && /[A-Z]/.test(password);
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

  const normalizedUsername = String(username).trim();

  // Every login checks all role collections for this username. A username can
  // legally exist in more than one role collection, so we must compare the
  // submitted password against every matching record instead of stopping at
  // the first match. That is the cause of the false "Invalid username or
  // password" result when a valid account is hidden behind an earlier duplicate.
  const matches = await Promise.all(
    Object.entries(ROLE_MODELS).map(async ([role, Model]) => {
      const user = await Model.findOne({ username: normalizedUsername });
      return user ? { role, user } : null;
    })
  );

  const candidates = matches.filter(Boolean);
  if (!candidates.length) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  let matchedUser = null;
  let matchedRole = null;

  for (const { role, user } of candidates) {
    const isMatch = await user.comparePassword(password);
    if (isMatch) {
      matchedUser = user;
      matchedRole = role;
      break;
    }
  }

  if (!matchedUser) {
    await writeAudit(candidates[0].role, normalizedUsername, "login_failed", "");
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = signToken(matchedUser, matchedRole);
  const { password: _pw, ...safeUser } = matchedUser.toObject();

  writeAudit(matchedRole, normalizedUsername, "login_success", "");
  return res.json({
    token,
    user: { ...safeUser, role: matchedRole, mustChangePassword: !!matchedUser.mustChangePassword },
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
  if (!isValidSelfSetPassword(newPassword)) {
    return res.status(400).json({ message: SELF_SET_PASSWORD_MESSAGE });
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

// Shared by every role — same "look up the caller's own model via their
// token" pattern as changePassword above. Updates the dashboard-header
// avatar photo for whichever account is currently logged in (Student
// already had its own separate photo endpoint under /student for its
// fuller Profile page — this one covers every role, including Student,
// for the header's own upload control). Students only get one self-service
// set (see studentcontrol.js updatePhoto for the same rule enforced
// there) — checked again here since this is a separate route that reaches
// the same underlying document.
export const updateMyPhoto = async (req, res) => {
  const { photo } = req.body; // base64 data URL, already downscaled client-side

  const Model = ROLE_MODELS[req.user.role];
  const user = await Model.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (req.user.role === "STUDENT" && user.photoLocked) {
    return res.status(403).json({
      message:
        "Your profile photo can only be set once. To change it now, submit a photo change request from My Profile for Admin approval.",
    });
  }

  user.photo = photo || undefined;
  if (req.user.role === "STUDENT" && photo) user.photoLocked = true;
  await user.save();
  res.json({ message: "Photo updated" });
};
