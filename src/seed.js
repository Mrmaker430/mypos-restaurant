import bcrypt from "bcryptjs";
import User from "./models/User.js";
import Category from "./models/Category.js";
import Product from "./models/Product.js";

export async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const existing = await User.findOne({ email });
  if (!existing) {
    const password = await bcrypt.hash(configuredPassword, 12);
    await User.create({ name: process.env.ADMIN_NAME || "Restaurant Admin", email, password, role: "admin" });
    console.log(`Created admin account: ${email}`);
  } else if (process.env.ADMIN_RESET_PASSWORD === "true") {
    existing.password = await bcrypt.hash(configuredPassword, 12);
    existing.name = process.env.ADMIN_NAME || existing.name;
    existing.role = "admin";
    existing.active = true;
    await existing.save();
    console.log(`Reset admin password for: ${email}`);
  } else {
    console.log(`Admin account ready: ${email}. Existing password left unchanged.`);
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
