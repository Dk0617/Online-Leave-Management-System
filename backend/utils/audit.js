import AuditEntry from "../models/AuditEntry.js";

// Fire-and-forget audit log write — never blocks or fails the calling request.
export async function writeAudit(role, user, action, details) {
  try {
    await AuditEntry.create({ role, user, action, details: details || "" });
  } catch (err) {
    console.error("Failed to write audit entry:", err.message);
  }
}
