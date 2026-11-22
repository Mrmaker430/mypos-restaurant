const $ = s => document.querySelector(s);
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(Number(n||0));
let token=localStorage.getItem("mypos_token"), user=null, products=[], categories=[], cart=[], lastOrder=null;
const api=async(path,opts={})=>{
  const res=await fetch("/api"+path,{...opts,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{ }),...(opts.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.message||"Request failed");
  return data;
};
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showLogin(){ $("#loginView").classList.remove("hidden");$("#appView").classList.add("hidden");}
function showApp(){ $("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#userName").textContent=user.name;$("#avatar").textContent=user.name[0].toUpperCase(); }
async function boot(){
  if(!token)return showLogin();
  try{const d=await api("/auth/me");user=d.user;showApp();await loadAll();}
  catch{token=null;localStorage.removeItem("mypos_token");showLogin();}
}
$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#loginError").textContent="";
  const f=new FormData(e.currentTarget);
  try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:f.get("email"),password:f.get("password")})});token=d.token;user=d.user;localStorage.setItem("mypos_token",token);showApp();await loadAll();}
  catch(err){$("#loginError").textContent=err.message;}
});
$("#logoutBtn").onclick=()=>{localStorage.removeItem("mypos_token");token=null;user=null;showLogin()};
function navigate(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.add("hidden"));
  $(`#${page}Page`).classList.remove("hidden");
  document.querySelectorAll(".nav-link[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===page));
  $("#pageTitle").textContent=({dashboard:"Dashboard",pos:"New bill",orders:"Order history",menu:"Menu management",integrations:"Delivery integrations"})[page];
  if(page==="dashboard")loadDashboard();if(page==="orders")loadOrders();if(page==="menu")loadMenu();if(page==="integrations")loadIntegrationStatus();
}
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>navigate(b.dataset.page));
document.querySelectorAll("[data-go]").forEach(b=>b.onclick=()=>navigate(b.dataset.go));
async function loadAll(){await Promise.all([loadDashboard(),loadProducts(),loadCategories()]);}
async function loadDashboard(){
  try{const d=await api("/reports/summary");$("#salesToday").textContent=money(d.sales);$("#ordersToday").textContent=d.orders;$("#cashToday").textContent=money(d.byMethod.cash);$("#upiToday").textContent=money(d.byMethod.upi);
  $("#topProducts").innerHTML=d.topProducts.length?d.topProducts.map(p=>`<div class="top-item"><span>${escapeHtml(p._id)} <small class="muted">× ${p.quantity}</small></span><b>${money(p.sales)}</b></div>`).join(""):'<div class="list-empty">No sales recorded yet.</div>';}catch(e){toast(e.message)}
}
async function loadProducts(){
  products=await api("/products");renderProducts();
}
async function loadCategories(){
  categories=await api("/categories");
  $("#categorySelect").innerHTML='<option value="">Uncategorised</option>'+categories.map(c=>`<option value="${c._id}">${escapeHtml(c.name)}</option>`).join("");
}
function renderProducts(){
  const q=$("#productSearch").value.toLowerCase();
  const list=products.filter(p=>p.name.toLowerCase().includes(q));
  $("#productGrid").innerHTML=list.length?list.map(p=>`<button class="product-card" data-product="${p._id}"><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.category?.name||"Menu item")} · GST ${p.gstRate||0}%</small><span>${money(p.price)}</span></button>`).join(""):'<div class="list-empty">No menu items found.</div>';
  document.querySelectorAll("[data-product]").forEach(b=>b.onclick=()=>addToCart(b.dataset.product));
}
$("#productSearch").addEventListener("input",renderProducts);
function addToCart(id){const p=products.find(x=>x._id===id);if(!p)return;const line=cart.find(x=>x.productId===id);if(line)line.quantity++;else cart.push({productId:id,name:p.name,unitPrice:p.price,gstRate:p.gstRate||0,quantity:1});renderCart();}
function renderCart(){
  $("#cartCount").textContent=`${cart.reduce((a,x)=>a+x.quantity,0)} items`;
  $("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><div><b>${escapeHtml(x.name)}</b><small>${money(x.unitPrice)} each</small></div><div class="qty"><button data-dec="${x.productId}">−</button><b>${x.quantity}</b><button data-inc="${x.productId}">+</button></div></div>`).join(""):'<div class="list-empty">Your bill is empty. Add menu items.</div>';
  document.querySelectorAll("[data-dec]").forEach(b=>b.onclick=()=>changeQty(b.dataset.dec,-1));
  document.querySelectorAll("[data-inc]").forEach(b=>b.onclick=()=>changeQty(b.dataset.inc,1));
  const sub=cart.reduce((a,x)=>a+x.unitPrice*x.quantity,0),tax=cart.reduce((a,x)=>a+x.unitPrice*x.quantity*x.gstRate/100,0),disc=Math.max(0,Number($("#discount").value)||0);
  $("#subtotal").textContent=money(sub);$("#taxTotal").textContent=money(tax);$("#grandTotal").textContent=money(Math.max(0,sub+tax-disc));
}
function changeQty(id,n){const x=cart.find(x=>x.productId===id);if(!x)return;x.quantity+=n;if(x.quantity<=0)cart=cart.filter(y=>y!==x);renderCart();}
$("#clearCart").onclick=()=>{cart=[];$("#discount").value=0;renderCart()};
$("#discount").oninput=renderCart;
$("#orderType").onchange=()=>$("#deliveryAddress").classList.toggle("hidden",$("#orderType").value!=="delivery");
$("#placeOrder").onclick=async()=>{
  if(!cart.length)return toast("Add at least one item");
  const orderType=$("#orderType").value;
  const body={items:cart.map(x=>({productId:x.productId,quantity:x.quantity})),orderType,paymentMethod:$("#paymentMethod").value,customerName:$("#customerName").value.trim(),customerPhone:$("#customerPhone").value.trim(),deliveryAddress:$("#deliveryAddress").value.trim(),discount:Number($("#discount").value)||0};
  const btn=$("#placeOrder");btn.disabled=true;btn.textContent="Saving order...";
  try{lastOrder=await api("/orders",{method:"POST",body:JSON.stringify(body)});toast(`Order ${lastOrder.orderNumber} saved`);printReceipt(lastOrder);cart=[];$("#discount").value=0;$("#customerName").value="";$("#customerPhone").value="";$("#deliveryAddress").value="";renderCart();await loadDashboard();}
  catch(e){toast(e.message)}
  finally{btn.disabled=false;btn.textContent="Complete payment & print";}
};
function printReceipt(o){
  const date=new Date(o.createdAt).toLocaleString("en-IN");
  $("#receipt").innerHTML=`<h2>YOUR RESTAURANT</h2><p>Thank you for your order</p><hr><p>${escapeHtml(o.orderNumber)}</p><p>${date}</p><p>${o.orderType.toUpperCase()} · ${o.paymentMethod.toUpperCase()}</p><hr><table>${o.items.map(i=>`<tr><td>${escapeHtml(i.name)} ×${i.quantity}</td><td class="right">${money(i.lineSubtotal)}</td></tr>`).join("")}</table><hr><table><tr><td>Subtotal</td><td class="right">${money(o.subtotal)}</td></tr><tr><td>GST</td><td class="right">${money(o.taxTotal)}</td></tr><tr><td>Discount</td><td class="right">-${money(o.discount)}</td></tr><tr><td class="total">TOTAL</td><td class="right total">${money(o.total)}</td></tr></table><hr><p>Payment: ${o.paymentMethod.toUpperCase()}</p><p>*** THANK YOU ***</p>`;
  setTimeout(()=>window.print(),250);
}
async function loadOrders(){
  const list=await api("/orders");
  $("#ordersTable").innerHTML=list.length?list.map(o=>`<tr><td><b>${escapeHtml(o.orderNumber)}</b></td><td>${new Date(o.createdAt).toLocaleString("en-IN")}</td><td>${o.orderType}</td><td><span class="pill">${escapeHtml(o.source||"pos").toUpperCase()}</span></td><td><b>${money(o.total)}</b></td><td>${o.paymentMethod.toUpperCase()}</td><td><span class="pill ${o.status}">${o.status}</span></td><td><select data-status="${o._id}"><option value="">Update</option>${["received","preparing","ready","completed","cancelled"].map(s=>`<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></td></tr>`).join(""):'<tr><td colspan="8" class="list-empty">No orders yet.</td></tr>';
  document.querySelectorAll("[data-status]").forEach(s=>s.onchange=async()=>{if(!s.value)return;try{await api(`/orders/${s.dataset.status}/status`,{method:"PATCH",body:JSON.stringify({status:s.value})});toast("Order status updated");loadOrders()}catch(e){toast(e.message)}});
}
$("#refreshOrders").onclick=loadOrders;
async function loadMenu(){
  await Promise.all([loadProducts(),loadCategories()]);
  $("#adminProductList").innerHTML=products.map(p=>`<div class="admin-product"><span><b>${escapeHtml(p.name)}</b><small class="muted">${escapeHtml(p.category?.name||"Uncategorised")} · GST ${p.gstRate||0}%</small></span><span><b>${money(p.price)}</b> <button class="text-btn" data-remove="${p._id}">Disable</button></span></div>`).join("")||'<div class="list-empty">No menu items.</div>';
  document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{if(!confirm("Disable this menu item?"))return;try{await api(`/products/${b.dataset.remove}`,{method:"DELETE"});toast("Menu item disabled");loadMenu()}catch(e){toast(e.message)}});
}
$("#productForm").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget),body=Object.fromEntries(f.entries());
  body.price=Number(body.price);body.gstRate=Number(body.gstRate);if(!body.category)delete body.category;
  try{await api("/products",{method:"POST",body:JSON.stringify(body)});e.currentTarget.reset();toast("Menu item added");await loadMenu();}catch(err){toast(err.message)}
};
async function loadIntegrationStatus(){
  try{
    const s=await api("/integrations/status");
    const live=Boolean(s.live);
    $("#integrationState").textContent=live?"CONNECTED":"NOT CONNECTED";
    $("#integrationState").classList.toggle("connected",live);
    $("#zomatoIntegrationState").textContent=live&&s.capabilities?.zomato==="connected"?"Connected":"Awaiting onboarding";
    $("#swiggyIntegrationState").textContent=live&&s.capabilities?.swiggy==="connected"?"Connected":"Awaiting onboarding";
  }catch(e){toast(`Could not read integration status: ${e.message}`)}
}
$("#refreshIntegration").onclick=loadIntegrationStatus;
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
renderCart();boot();
