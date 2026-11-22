import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
  price: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, default: 0, min: 0, max: 100 },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });
schema.index({ name: 1 });
export default mongoose.model("Product", schema);
