import jwt from "jsonwebtoken";
import { ROLE_MODELS } from "../utils/roleModels.js";
import Notification from "../models/Notification.js";
import { writeAudit } from "../utils/audit.js";

export const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required" });
  }

  for (const [role, Model] of Object.entries(ROLE_MODELS)) {
    const user = await Model.findOne({ username });
    if (!user) continue;

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await writeAudit(role, username, "login_failed", "");
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id, role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const { password: _pw, ...safeUser } = user.toObject();
    await writeAudit(role, username, "login_success", "");
    return res.json({
      token,
      user: { ...safeUser, role, mustChangePassword: !!user.mustChangePassword },
    });
  }

  return res.status(401).json({ message: "Invalid username or password" });
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
