import { Router } from "express";
import Category from "../models/Category.js";
import { auth, adminOnly } from "../middleware/auth.js";
const r = Router(); r.use(auth);
r.get("/", async (_req,res)=>res.json(await Category.find({active:true}).sort("name")));
r.post("/", adminOnly, async (req,res)=>{
  const name=String(req.body.name||"").trim();
  if(!name) return res.status(400).json({message:"Category name required"});
  try { res.status(201).json(await Category.create({name})); }
  catch { res.status(409).json({message:"Category already exists"}); }
});
r.delete("/:id", adminOnly, async(req,res)=>{
  await Category.findByIdAndUpdate(req.params.id,{active:false}); res.json({message:"Category disabled"});
});
export default r;
