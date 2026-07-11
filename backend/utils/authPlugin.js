import bcrypt from "bcryptjs";

// Shared by every role schema: hashes password on save and adds comparePassword().
export function withPasswordAuth(schema) {
  schema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 10);
  });

  schema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
  };
}
