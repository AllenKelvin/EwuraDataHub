import { mongoose } from "../lib/mongodb";

const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  network: { type: String, enum: ["MTN", "Telecel", "AirtelTigo"], required: true, index: true },
  type: { type: String, enum: ["airtime", "data"], default: "data", required: true },
  dataAmount: { type: String, required: true },
  price: { type: Number, default: 0 },
  userPrice: { type: Number, required: true },
  agentPrice: { type: Number, required: true },
  description: { type: String, required: true },
  vendorProductId: { type: String }, // Mapping to vendor product ID
}, { timestamps: true });

// Index for efficient querying by network
PackageSchema.index({ network: 1 });
PackageSchema.index({ type: 1 });

export interface IPackage {
  _id: mongoose.Types.ObjectId;
  name: string;
  network: "MTN" | "Telecel" | "AirtelTigo";
  type: "airtime" | "data";
  dataAmount: string;
  price: number;
  userPrice: number;
  agentPrice: number;
  description: string;
  vendorProductId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Package = mongoose.models.Package || mongoose.model<IPackage>("Package", PackageSchema);
