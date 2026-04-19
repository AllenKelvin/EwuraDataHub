import { mongoose } from "../lib/mongodb";
import bcryptjs from "bcryptjs";
import { verifyPasswordWithMigration, hashPassword, isLegacyFormat } from "../lib/password-utils";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, trim: true, default: null },
  password: { type: String, required: true },
  passwordFormat: { type: String, enum: ["legacy", "bcrypt"], default: "bcrypt" }, // Track password format
  role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  totalFunded: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
}, { timestamps: true });

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  
  // Only hash if it's not already a bcrypt hash or legacy format
  const password = this.password as string;
  if (!password.startsWith('$2') && !password.includes('.')) {
    this.password = await hashPassword(password);
    this.passwordFormat = "bcrypt";
  }
});

/**
 * Compare password - supports both legacy and bcrypt formats
 * Automatically migrates legacy passwords to bcrypt
 */
UserSchema.methods.comparePassword = async function (candidate: string): Promise<{ valid: boolean; migrated: boolean }> {
  const stored = this.password as string;
  const format = this.passwordFormat as string;
  
  // Use the new verification function that supports both formats
  const result = await verifyPasswordWithMigration(candidate, stored);
  
  if (!result.valid) {
    return { valid: false, migrated: false };
  }
  
  // If valid and needs migration (old format), migrate to bcrypt
  if (result.needsMigration) {
    try {
      this.password = await hashPassword(candidate);
      this.passwordFormat = "bcrypt";
      await this.save();
      return { valid: true, migrated: true };
    } catch (err) {
      console.error("Failed to migrate password:", err);
      // Still return valid even if migration fails
      return { valid: true, migrated: false };
    }
  }
  
  return { valid: true, migrated: false };
};

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  phone?: string | null;
  password: string;
  passwordFormat?: "legacy" | "bcrypt";
  role: "user" | "agent" | "admin";
  isVerified: boolean;
  walletBalance: number;
  totalFunded: number;
  totalSpent: number;
  createdAt: Date;
  comparePassword(candidate: string): Promise<{ valid: boolean; migrated: boolean }>;
}

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
