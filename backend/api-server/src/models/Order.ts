import { mongoose } from "../lib/mongodb";

const OrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  productId: { type: String },
  network: { type: String, enum: ["MTN", "Telecel", "AirtelTigo"], required: true },
  type: { type: String, enum: ["airtime", "data"], required: true },
  productName: { type: String, required: true },
  recipientPhone: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
  paymentMethod: { type: String, enum: ["paystack", "wallet", "vendor_wallet"], required: true },
  paymentReference: { type: String },
  
  // Vendor integration fields
  vendorOrderId: { type: String },
  vendorProductId: { type: String },
  vendorPhoneNumber: { type: String },
  vendorStatus: { type: String, enum: ["pending", "processing", "completed", "failed"] },
}, { timestamps: true });

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  productId?: string;
  network: "MTN" | "Telecel" | "AirtelTigo";
  type: "airtime" | "data";
  productName: string;
  recipientPhone: string;
  amount: number;
  status: "pending" | "processing" | "completed" | "failed";
  paymentMethod: "paystack" | "wallet" | "vendor_wallet";
  paymentReference?: string;
  vendorOrderId?: string;
  vendorProductId?: string;
  vendorPhoneNumber?: string;
  vendorStatus?: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

export const Order = mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);
