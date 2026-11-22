import { Router } from "express";
import Order from "../models/Order.js";
import { auth } from "../middleware/auth.js";
const r=Router(); r.use(auth);

r.get("/summary",async(req,res)=>{
  try {
    const now=new Date(), start=new Date(now); start.setHours(0,0,0,0);
    const end=new Date(start); end.setDate(end.getDate()+1);
    const paidMatch={status:{$ne:"cancelled"},paymentStatus:"paid"};
    const todayMatch={...paidMatch,createdAt:{$gte:start,$lt:end}};
    const [today,orders,methods,allTime,items]=await Promise.all([
      Order.aggregate([{$match:todayMatch},{$group:{_id:null,sales:{$sum:"$total"},count:{$sum:1}}}]),
      Order.countDocuments(todayMatch),
      Order.aggregate([{$match:todayMatch},{$group:{_id:"$paymentMethod",amount:{$sum:"$total"}}}]),
      Order.aggregate([{$match:paidMatch},{$group:{_id:null,sales:{$sum:"$total"}}}]),
      Order.aggregate([
        {$match:paidMatch},{$unwind:"$items"},
        {$group:{_id:"$items.name",quantity:{$sum:"$items.quantity"},sales:{$sum:"$items.lineSubtotal"}}},
        {$sort:{quantity:-1}}
      ])
    ]);
    const byMethod={cash:0,upi:0}; methods.forEach(x=>byMethod[x._id]=x.amount);
    const itemsSold=items.reduce((sum,item)=>sum+item.quantity,0);
    res.json({
      sales:today[0]?.sales||0,
      totalSales:allTime[0]?.sales||0,
      orders,
      itemsSold,
      byMethod,
      itemSummary:items.slice(0,10).map(item=>({name:item._id,quantity:item.quantity,sales:item.sales}))
    });
  } catch(error) {
    console.error("Report summary failed:",error);
    res.status(500).json({message:"Could not load sales summary"});
  }
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
