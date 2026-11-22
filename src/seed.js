import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const existing = await User.findOne({ email });
  if (!existing) {
    const password = await bcrypt.hash(process.env.ADMIN_PASSWORD || "ChangeMe123!", 12);
    await User.create({ name: process.env.ADMIN_NAME || "Restaurant Admin", email, password, role: "admin" });
    console.log(`Created admin account: ${email}`);
  }
  if (await Category.countDocuments() === 0) {
    const cats = await Category.insertMany([{name:"Meals"},{name:"Snacks"},{name:"Drinks"}]);
    await Product.insertMany([
      {name:"Veg Fried Rice", category:cats[0]._id, price:120, gstRate:5},
      {name:"Chicken Biryani", category:cats[0]._id, price:180, gstRate:5},
      {name:"French Fries", category:cats[1]._id, price:80, gstRate:5},
      {name:"Cold Drink", category:cats[2]._id, price:40, gstRate:5}
    ]);
  }
}
