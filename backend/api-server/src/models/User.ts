import { mongoose } from "../lib/mongodb";
import bcryptjs from "bcryptjs";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "agent", "admin"], default: "user" },
  isVerified: { type: Boolean, default: false },
  walletBalance: { type: Number, default: 0 },
  totalFunded: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
}, { timestamps: true });

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcryptjs.hash(this.password as string, 10);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcryptjs.compare(candidate, this.password as string);
};

export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  email: string;
  phone: string;
  password: string;
  role: "user" | "agent" | "admin";
  isVerified: boolean;
  walletBalance: number;
  totalFunded: number;
  totalSpent: number;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
