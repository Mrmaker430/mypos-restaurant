import { Router } from "express";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";
const r=Router(); r.use(auth);
r.get("/summary",async(req,res)=>{
  const now=new Date(), start=new Date(now); start.setHours(0,0,0,0);
  const end=new Date(start); end.setDate(end.getDate()+1);
  const paid={createdAt:{$gte:start,$lt:end},status:{$ne:"cancelled"},paymentStatus:"paid"};
  const [today,orders,methods,top]=await Promise.all([
    Order.aggregate([{$match:paid},{$group:{_id:null,sales:{$sum:"$total"},count:{$sum:1}}}]),
    Order.countDocuments(paid),
    Order.aggregate([{$match:paid},{$group:{_id:"$paymentMethod",amount:{$sum:"$total"}}}]),
    Order.aggregate([{$match:paid},{$unwind:"$items"},{$group:{_id:"$items.name",quantity:{$sum:"$items.quantity"},sales:{$sum:"$items.lineSubtotal"}}},{$sort:{quantity:-1}},{$limit:5}])
  ]);
  const byMethod={cash:0,upi:0}; methods.forEach(x=>byMethod[x._id]=x.amount);
  res.json({sales:today[0]?.sales||0,orders,byMethod,topProducts:top});
});
r.get("/daily",async(req,res)=>{
  const days=Math.min(Math.max(Number(req.query.days)||7,1),90);
  const from=new Date();from.setHours(0,0,0,0);from.setDate(from.getDate()-days+1);
  const rows=await Order.aggregate([
    {$match:{createdAt:{$gte:from},status:{$ne:"cancelled"},paymentStatus:"paid"}},
    {$group:{_id:{$dateToString:{format:"%Y-%m-%d",date:"$createdAt"}},sales:{$sum:"$total"},orders:{$sum:1}}},
    {$sort:{_id:1}}
  ]);
  res.json(rows);
});
export default r;
