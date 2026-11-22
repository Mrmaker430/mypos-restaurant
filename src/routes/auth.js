import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth, adminOnly } from "../middleware/auth.js";
const r = Router();

r.post("/login", async (req, res) => {
  const email = String(req.body.email || "").toLowerCase().trim();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });
  if (!user || !user.active || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "Incorrect email or password" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  res.json({ token, user: { id:user._id, name:user.name, email:user.email, role:user.role } });
});
r.get("/me", auth, (req,res) => res.json({ user:req.user }));
r.post("/users", auth, adminOnly, async (req,res) => {
  const {name,email,password,role="staff"} = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({message:"Name, email and password (8+ chars) required"});
  try {
    const user = await User.create({name,email,password:await bcrypt.hash(password,12),role: role==="admin"?"admin":"staff"});
    res.status(201).json({id:user._id,name:user.name,email:user.email,role:user.role});
  } catch { res.status(409).json({message:"Email already exists"}); }
});
export default r;
