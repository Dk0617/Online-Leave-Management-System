import Notification from "../models/Notification.js";
import AuditEntry from "../models/AuditEntry.js";

// One-time move of the old admin "Password Changes" feed into the audit log.
// Each old row becomes a password_changed audit entry with its original
// timestamp, unless the audit log already has that change (every change was
// written to both places, so only rows missing from the audit log — e.g.
// after the log was cleared — get copied). The old rows are then deleted,
// so this does nothing on later startups.
export async function migratePasswordNotifications() {
  try {
    const old = await Notification.find().lean();
    if (old.length === 0) return;

    let copied = 0;
    for (const n of old) {
      const t = new Date(n.createdAt).getTime();
      const exists = await AuditEntry.exists({
        action: "password_changed",
        user: n.username,
        createdAt: { $gte: new Date(t - 60_000), $lte: new Date(t + 60_000) },
      });
      if (!exists) {
        await AuditEntry.create(
          [
            {
              role: n.role,
              user: n.username,
              action: "password_changed",
              details: `Self-service change by ${n.name || n.username} (from old Password Changes page)`,
              createdAt: n.createdAt,
              updatedAt: n.createdAt,
            },
          ],
          { timestamps: false }
        );
        copied++;
      }
    }
    await Notification.deleteMany({ _id: { $in: old.map((n) => n._id) } });
    console.log(`Moved ${old.length} old password-change notifications to the audit log (${copied} were missing from it).`);
  } catch (err) {
    console.error("Failed to migrate password-change notifications:", err.message);
  }
}
