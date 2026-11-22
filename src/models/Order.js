import mongoose from "mongoose";
const itemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, default: 0, min: 0 },
  lineSubtotal: { type: Number, required: true },
  lineTax: { type: Number, required: true }
}, { _id: false });
const schema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, index: true },
  orderType: { type: String, enum: ["takeaway", "delivery"], required: true },
  source: { type: String, enum: ["pos", "zomato", "swiggy"], default: "pos", index: true },
  integrationProvider: { type: String, default: "" },
  externalOrderId: { type: String, default: undefined },
  customerName: { type: String, default: "" },
  customerPhone: { type: String, default: "" },
  deliveryAddress: { type: String, default: "" },
  items: { type: [itemSchema], validate: v => v.length > 0 },
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxTotal: { type: Number, default: 0 },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ["cash", "upi"], required: true },
  paymentStatus: { type: String, enum: ["paid", "pending"], default: "paid" },
  status: { type: String, enum: ["received", "preparing", "ready", "completed", "cancelled"], default: "received" },
  notes: { type: String, default: "" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
schema.index({ integrationProvider: 1, externalOrderId: 1 }, { unique: true, partialFilterExpression: { externalOrderId: { $type: "string" } } });
export default mongoose.model("Order", schema);
