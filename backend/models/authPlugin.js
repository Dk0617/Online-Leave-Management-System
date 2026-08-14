import bcrypt from "bcryptjs";

// Shared by every role schema: hashes password on save and adds comparePassword().
// Legacy plain-text passwords are also accepted here so older database rows can
// still log in once, then be upgraded to a proper bcrypt hash automatically.
export function withPasswordAuth(schema) {
  schema.pre("save", async function () {
    if (!this.isModified("password") || !this.password) return;

    const password = this.password;
    const isBcryptHash =
      typeof password === "string" &&
      (password.startsWith("$2a$") || password.startsWith("$2b$") || password.startsWith("$2y$"));

    if (isBcryptHash) return;

    this.password = await bcrypt.hash(password, 10);
  });

  schema.methods.comparePassword = async function (candidate) {
    if (typeof candidate !== "string" || !candidate || !this.password) {
      return false;
    }

    try {
      const isHashMatch = await bcrypt.compare(candidate, this.password);
      if (isHashMatch) return true;
    } catch {
      // Ignore hashing/compare errors and fall through to the legacy fallback.
    }

    if (this.password === candidate) {
      const passwordHash = await bcrypt.hash(candidate, 10);
      await this.constructor.updateOne({ _id: this._id }, { $set: { password: passwordHash } });
      this.password = passwordHash;
      return true;
    }

    return false;
  };
}
