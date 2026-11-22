import { Router } from "express";
import Product from "../models/Product.js";
import { auth, adminOnly } from "../middleware/auth.js";
const r=Router(); r.use(auth);
r.get("/", async(req,res)=>{
  const filter={active:true};
  if(req.query.category) filter.category=req.query.category;
  res.json(await Product.find(filter).populate("category","name").sort("name"));
});
r.post("/", adminOnly, async(req,res)=>{
  const {name,price,category,gstRate=0,description=""}=req.body;
  if(!name || !Number.isFinite(Number(price)) || Number(price)<0) return res.status(400).json({message:"Valid name and price required"});
  const p=await Product.create({name,price:Number(price),category:category||null,gstRate:Number(gstRate),description});
  res.status(201).json(p);
});
r.patch("/:id", adminOnly, async(req,res)=>{
  const allowed=["name","price","category","gstRate","description","active"];
  const update=Object.fromEntries(Object.entries(req.body).filter(([k])=>allowed.includes(k)));
  const p=await Product.findByIdAndUpdate(req.params.id,update,{new:true,runValidators:true}).populate("category","name");
  if(!p) return res.status(404).json({message:"Product not found"});
  res.json(p);
});
r.delete("/:id", adminOnly, async(req,res)=>{
  const p=await Product.findByIdAndUpdate(req.params.id,{active:false},{new:true});
  if(!p) return res.status(404).json({message:"Product not found"});
  res.json({message:"Product disabled"});
});
export default r;
