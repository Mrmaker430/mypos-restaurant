import { Router } from "express";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { auth } from "../middleware/auth.js";
const r=Router(); r.use(auth);
const round=n=>Math.round((n+Number.EPSILON)*100)/100;

r.post("/", async(req,res)=>{
  try {
    const {items,orderType,customerName="",customerPhone="",deliveryAddress="",discount=0,paymentMethod,notes=""}=req.body;
    if(!Array.isArray(items)||!items.length) return res.status(400).json({message:"Add at least one item"});
    if(!["takeaway","delivery"].includes(orderType)) return res.status(400).json({message:"Invalid order type"});
    if(!["cash","upi"].includes(paymentMethod)) return res.status(400).json({message:"Choose cash or UPI"});
    if(orderType==="delivery" && !deliveryAddress.trim()) return res.status(400).json({message:"Delivery address required"});
    const ids=items.map(i=>i.productId);
    if(ids.some(id=>!mongoose.isValidObjectId(id))) return res.status(400).json({message:"Invalid product"});
    const products=await Product.find({_id:{$in:ids},active:true});
    const byId=new Map(products.map(p=>[String(p._id),p]));
    let subtotal=0,taxTotal=0;
    const clean=[];
    for(const line of items){
      const p=byId.get(String(line.productId)), qty=Math.floor(Number(line.quantity));
      if(!p || !Number.isInteger(qty) || qty<1 || qty>999) return res.status(400).json({message:"Invalid item or quantity"});
      const base=round(p.price*qty), tax=round(base*Number(p.gstRate||0)/100);
      subtotal+=base; taxTotal+=tax;
      clean.push({productId:p._id,name:p.name,quantity:qty,unitPrice:p.price,gstRate:p.gstRate,lineSubtotal:base,lineTax:tax});
    }
    subtotal=round(subtotal); taxTotal=round(taxTotal);
    const disc=round(Number(discount));
    if(!Number.isFinite(disc)||disc<0||disc>subtotal+taxTotal) return res.status(400).json({message:"Invalid discount"});
    const total=round(subtotal+taxTotal-disc);
    const order=await Order.create({
      orderNumber:`MP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random()*90+10)}`,
      orderType,customerName,customerPhone,deliveryAddress,items:clean,subtotal,discount:disc,taxTotal,total,
      paymentMethod,paymentStatus:"paid",notes,createdBy:req.user._id
    });
    res.status(201).json(order);
  } catch(e) { res.status(500).json({message:"Could not create order",error:e.message}); }
});
r.get("/", async(req,res)=>{
  const {from,to,status,limit=100}=req.query, filter={};
  if(status) filter.status=status;
  if(from||to){filter.createdAt={};if(from)filter.createdAt.$gte=new Date(from);if(to)filter.createdAt.$lte=new Date(`${to}T23:59:59.999`);}
  res.json(await Order.find(filter).sort({createdAt:-1}).limit(Math.min(Number(limit)||100,500)).populate("createdBy","name"));
});
r.get("/:id", async(req,res)=>{
  const o=await Order.findById(req.params.id);
  if(!o) return res.status(404).json({message:"Order not found"});
  res.json(o);
});
r.patch("/:id/status", async(req,res)=>{
  const allowed=["received","preparing","ready","completed","cancelled"];
  if(!allowed.includes(req.body.status)) return res.status(400).json({message:"Invalid status"});
  const o=await Order.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true});
  if(!o) return res.status(404).json({message:"Order not found"});
  res.json(o);
});
export default r;
