import {useEffect,useMemo,useState} from "react";
import {NavLink} from "react-router-dom";
import AppShell,{Stat,Empty} from "../components/AppShell";
import {useAuth} from "../context/AuthContext";
import {supabase} from "../lib/supabase";
import {ArrowRight,ArrowUpRight,ChartLine,SquaresFour,CheckCircle,CurrencyInr,Package,ShoppingCart,Storefront,Truck,WarningCircle,Wallet,Receipt,Gear,UsersThree,Sparkle,Plus,UploadSimple,Stack} from "@phosphor-icons/react";

const money=n=>"₹"+Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:0});
const pct=n=>Math.round(Number(n||0)*100)/100;
function Card({children,className=""}){return <section className={"panel "+className}>{children}</section>}
function Head({kicker,title,text,action}){return <div className="panel-head"><div>{kicker&&<span className="section-kicker">{kicker}</span>}<h2>{title}</h2>{text&&<p>{text}</p>}</div>{action}</div>}

export function SellerCommandCenter(){
 const {session}=useAuth();
 const [d,setD]=useState({orders:[],products:[],listings:[],stores:[],wallet:null});
 const [loading,setLoading]=useState(true);
 useEffect(()=>{if(!session?.user?.id)return;const u=session.user.id;
  Promise.all([
   supabase.from("orders").select("*").eq("seller_id",u).order("created_at",{ascending:false}),
   supabase.from("products").select("*").eq("status","active"),
   supabase.from("listings").select("*").eq("seller_id",u),
   supabase.from("stores").select("*").eq("seller_id",u),
   supabase.from("wallet_accounts").select("*").eq("user_id",u).maybeSingle()
  ]).then(([o,p,l,st,w])=>{setD({orders:o.data||[],products:p.data||[],listings:l.data||[],stores:st.data||[],wallet:w.data||null});setLoading(false)})
 },[session?.user?.id]);

 const revenue=d.orders.reduce((a,o)=>a+Number(o.amount||0),0);
 const delivered=d.orders.filter(o=>o.status==="delivered");
 const pending=d.orders.filter(o=>["pending","confirmed"].includes(o.status)).length;
 const exceptions=d.orders.filter(o=>["ndr","rto"].includes(o.status)).length;
 const margin=d.orders.reduce((a,o)=>a+Number(o.seller_margin||0),0);
 const estimatedMargin=margin||d.orders.reduce((a,o)=>a+Math.max(0,Number(o.amount||0)-Number(o.cost_price||0)-Number(o.shipping_cost||0)),0);
 const aov=d.orders.length?revenue/d.orders.length:0;
 const delivery=d.orders.length?Math.round(delivered.length/d.orders.length*100):0;
 const cod=d.orders.filter(o=>String(o.payment_mode||o.payment_method||"").toLowerCase().includes("cod"));
 const codValue=cod.reduce((a,o)=>a+Number(o.amount||0),0);
 const walletAvailable=Number(d.wallet?.available_balance||0);
 const setupSteps=[
  [!d.stores.length,"Connect Shopify","Bring your store orders into Bucket India.","Connect store","/seller/stores",Storefront],
  [!d.listings.length,"Add your first product","Choose a product, calculate profit and launch it.","Discover products","/seller/products",Package],
  [!d.listings.length,"Calculate profit before selling","Know your net margin after shipping, COD and RTO costs.","Calculate profit","/seller/profit",CurrencyInr],
  [d.orders.length===0,"Get your first order","Once your store and product are live, start taking orders.","Open orders","/seller/orders",ShoppingCart],
  [exceptions>0,"Resolve delivery exceptions","Recover NDR/RTO orders before they become lost revenue.","Fix exceptions","/seller/ndr",WarningCircle],
 ].filter(x=>x[0]);
 const completedSetup=[d.stores.length>0,d.listings.length>0,d.orders.length>0].filter(Boolean).length;
 const health=Math.max(35,Math.min(98,55+(delivery*.25)+(d.stores.length*7)+(d.listings.length?10:0)-(exceptions*2)));
 const discover=d.products.slice(0,4);
 return <AppShell role="seller" title="Home">
  <section className="home-hero">
   <div className="home-hero-copy">
    <span className="hero-kicker">BUCKET INDIA · SELLER HOME</span>
    <h2>Everything you need to <span>start selling profitably.</span></h2>
    <p>Discover products, connect Shopify, understand your profit and manage every order from one simple home.</p>
    <div className="hero-actions">
     <NavLink className="btn primary" to="/seller/products"><SquaresFour size={17}/> Discover products <ArrowRight size={15}/></NavLink>
     <NavLink className="btn glass" to="/seller/profit"><CurrencyInr size={17}/> Calculate profit</NavLink>
    </div>
   </div>
   <div className="home-progress">
    <div className="home-progress-top"><span>Getting started</span><b>{completedSetup}/3</b></div>
    <div className="home-progress-bar"><i style={{width:Math.round(completedSetup/3*100)+"%"}}/></div>
    <small>{completedSetup===3?"Your core setup is complete. Keep growing.":"Complete the basics and your workspace is ready to grow."}</small>
   </div>
  </section>

  <section className="home-kpi-grid">
   <div className="home-kpi"><span><CurrencyInr size={17}/> Revenue</span><strong>{money(revenue)}</strong><small>{d.orders.length} total orders</small></div>
   <div className="home-kpi"><span><ChartLine size={17}/> Estimated profit</span><strong>{money(estimatedMargin)}</strong><small>Contribution after known costs</small></div>
   <div className="home-kpi"><span><ShoppingCart size={17}/> Orders</span><strong>{d.orders.length}</strong><small>{pending} need attention</small></div>
   <div className="home-kpi"><span><Truck size={17}/> Delivery rate</span><strong>{d.orders.length?delivery+"%":"—"}</strong><small>{exceptions} NDR / RTO exceptions</small></div>
   <div className="home-kpi"><span><Receipt size={17}/> AOV</span><strong>{d.orders.length?money(aov):"—"}</strong><small>Average order value</small></div>
   <div className="home-kpi"><span><Wallet size={17}/> Available balance</span><strong>{money(walletAvailable)}</strong><small>Ready for settlement / use</small></div>
  </section>

  <div className="home-main-grid">
   <Card className="home-tasks-card">
    <Head kicker="START HERE" title="Your next steps" text="We’ll keep this simple. Finish the tasks that unlock your store first."/>
    <div className="beginner-tasks">
     {setupSteps.length?setupSteps.slice(0,5).map(([show,title,text,cta,href,I],i)=><NavLink className="beginner-task" to={href} key={title}>
       <span className="task-number">{i+1}</span><span className="task-icon"><I size={19}/></span><div><b>{title}</b><p>{text}</p></div><strong>{cta}<ArrowRight size={14}/></strong>
     </NavLink>):<div className="task-complete"><CheckCircle size={24}/><div><b>You're all set</b><p>Your store foundation is complete. Explore products, monitor profit and grow your order volume.</p></div></div>}
    </div>
   </Card>

   <Card className="home-profit-card">
    <Head kicker="MONEY FIRST" title="Know your profit before you sell" text="Selling price is not profit. Model shipping, COD, payment fees and RTO before launching."/>
    <div className="profit-preview"><div><span>Example selling price</span><b>₹999</b></div><div><span>Estimated net profit</span><strong>₹299</strong></div></div>
    <div className="profit-points"><span><CheckCircle size={14}/> Vendor cost</span><span><CheckCircle size={14}/> Shipping</span><span><CheckCircle size={14}/> COD / payment fee</span><span><CheckCircle size={14}/> RTO risk</span></div>
    <NavLink className="btn primary full" to="/seller/profit">Open profit calculator <ArrowRight size={15}/></NavLink>
   </Card>
  </div>

  <div className="home-section-head"><div><span className="section-kicker">DISCOVER & LAUNCH</span><h2>Find your next product</h2><p>Start with products already available in the Bucket India marketplace.</p></div><NavLink className="btn secondary" to="/seller/products">View all products <ArrowRight size={14}/></NavLink></div>
  <div className="home-products">
   {discover.length?discover.map(p=><NavLink className="home-product" to="/seller/products" key={p.id}>
    <div className="home-product-image">{p.image_url?<img src={p.image_url} alt=""/>:<Package size={25}/>}</div>
    <div className="home-product-body"><span>{p.category||"General"}</span><b>{p.title||p.name||"Marketplace product"}</b><small>Vendor cost · {money(p.cost_price)}</small><strong>View product <ArrowUpRight size={13}/></strong></div>
   </NavLink>):<Card><Empty title="Product discovery is ready" text="Browse the marketplace to find products you can test and sell."/></Card>}
  </div>

  <section className="home-bottom-grid">
   <Card><Head kicker="TODAY AT A GLANCE" title="Your business snapshot"/>
    <div className="snapshot-list">
     <div><span><ShoppingCart size={16}/> Orders</span><b>{d.orders.length}</b><small>{pending} pending</small></div>
     <div><span><CurrencyInr size={16}/> COD value</span><b>{money(codValue)}</b><small>{cod.length} COD orders</small></div>
     <div><span><Truck size={16}/> Delivered</span><b>{delivered.length}</b><small>{delivery}% delivery rate</small></div>
     <div><span><WarningCircle size={16}/> Exceptions</span><b>{exceptions}</b><small>NDR + RTO</small></div>
    </div>
   </Card>
   <Card><Head kicker="STORE HEALTH" title={Math.round(health)+"/100"} text="A simple view of what is ready and what needs attention."/>
    <div className="home-health"><div className="health-ring" style={{"--score":health+"%"}}><b>{Math.round(health)}</b><span>/100</span></div><div className="health-checks"><span className={d.stores.length?"done":""}><Storefront size={15}/> Shopify connected <b>{d.stores.length?"Ready":"Do this first"}</b></span><span className={d.listings.length?"done":""}><Package size={15}/> Catalog <b>{d.listings.length?d.listings.length+" products":"Add a product"}</b></span><span className={exceptions?"risk":"done"}><WarningCircle size={15}/> Exceptions <b>{exceptions?"Needs attention":"Clear"}</b></span></div></div>
   </Card>
  </section>

  <Card className="home-quick-card"><Head kicker="WHEN YOU NEED IT" title="Quick access"/>
   <div className="home-quick-grid">{[
    ["Orders","Manage incoming orders","/seller/orders",ShoppingCart],["Shipments","Track delivery","/seller/shipping",Truck],["NDR / RTO","Recover at-risk orders","/seller/ndr",WarningCircle],["Wallet","See your money","/seller/wallet",Wallet],["Analytics","Understand performance","/seller/analytics",ChartLine],["Settings","Business & account setup","/seller/settings",Gear]
   ].map(([a,b,h,I])=><NavLink className="home-quick" to={h} key={a}><span><I size={18}/></span><div><b>{a}</b><small>{b}</small></div><ArrowRight size={14}/></NavLink>)}</div>
  </Card>
 </AppShell>
}
export function VendorCommandCenter(){
 const {session}=useAuth(); const [d,setD]=useState({vendor:null,products:[],orders:[]});
 const load=async()=>{if(!session?.user?.id)return;const {data:v}=await supabase.from("vendors").select("*").eq("owner_id",session.user.id).maybeSingle();if(!v)return setD({vendor:null,products:[],orders:[]});const [{data:p},{data:o}]=await Promise.all([supabase.from("products").select("*").eq("vendor_id",v.id),supabase.from("orders").select("*").eq("vendor_id",v.id).order("created_at",{ascending:false})]);setD({vendor:v,products:p||[],orders:o||[]})};useEffect(()=>{load()},[session?.user?.id]);
 const gmv=d.orders.reduce((a,o)=>a+Number(o.amount||0),0),low=d.products.filter(p=>Number(p.stock||0)<10).length,live=d.products.filter(p=>p.status==="active").length,pending=d.orders.filter(o=>o.status==="pending").length,shipped=d.orders.filter(o=>o.status==="shipped").length;
 const fulfillment=d.orders.length?Math.round(d.orders.filter(o=>["shipped","delivered"].includes(o.status)).length/d.orders.length*100):0; const health=Math.max(40,Math.min(98,62+Math.min(20,live)+Math.min(15,fulfillment/5)-low));
 return <AppShell role="vendor" title="Vendor Command Center"><section className="command-hero vendor-command"><div><span className="hero-kicker">BUCKET INDIA · SUPPLY OS</span><h2>Turn inventory into a <span>high-performance supply business.</span></h2><p>Import at scale, keep stock healthy, fulfill seller demand and see the economics of your supply network in one operating cockpit.</p><div className="hero-actions"><NavLink className="btn primary" to="/vendor/import">Import catalog ↗</NavLink><NavLink className="btn glass" to="/vendor/orders">Open fulfillment</NavLink></div></div><div className="hero-mini-stat"><b>{Math.round(health)}</b><span>supply health</span></div></section>
 <div className="stats modern-stats"><Stat label="Catalog products" value={d.products.length}/><Stat label="Live products" value={live} hint="Visible to sellers"/><Stat label="Order value" value={money(gmv)}/><Stat label="Low stock" value={low} hint="Below 10 units"/></div>
 <div className="attention-strip"><div><span className="section-kicker">SUPPLY ATTENTION</span><b>Keep the network moving.</b></div><div className="attention-items"><NavLink className="attention risk" to="/vendor/inventory"><i>!</i><span>{low||"No"} SKU{low!==1?"s":""} below safe stock</span><strong>Inventory →</strong></NavLink><NavLink className="attention action" to="/vendor/orders"><i>•</i><span>{pending} orders waiting in fulfillment</span><strong>Fulfill →</strong></NavLink><NavLink className="attention money" to="/vendor/sellers"><i>♙</i><span>Build stronger seller relationships</span><strong>Open network →</strong></NavLink></div></div>
 <div className="dashboard-grid command-grid"><Card><Head kicker="FULFILLMENT PIPELINE" title="Orders moving through your supply chain"/><div className="pipeline premium-pipeline">{["pending","confirmed","packed","shipped","delivered"].map(s=><div key={s}><b>{d.orders.filter(o=>o.status===s).length}</b><span>{s}</span><i/></div>)}</div><NavLink className="btn secondary" to="/vendor/orders">Open fulfillment queue →</NavLink></Card><Card><Head kicker="SUPPLY HEALTH" title={Math.round(health)+"/100"} /><div className="health-score"><div className="health-ring" style={{"--score":health+"%"}}><b>{Math.round(health)}</b><span>/100</span></div><div><b>Vendor operating score</b><p>Catalog depth, fulfillment momentum and inventory risk.</p><div className="health-bars"><span><i style={{width:Math.min(100,live?90:15)+"%"}}/>Catalog</span><span><i style={{width:Math.min(100,fulfillment)+"%"}}/>Fulfillment</span><span><i style={{width:Math.max(10,100-low*5)+"%"}}/>Stock</span></div></div></div></Card></div>
 <div className="growth-grid"><Card><Head kicker="CATALOG AT SCALE" title="Supply controls"/><div className="quick-grid">{[["Add product","Create a marketplace-ready SKU","/vendor/products","+"],["Import sheet","Upload hundreds of products","/vendor/import","↥"],["Inventory","Catch low stock before sellers do","/vendor/inventory","▦"],["Sellers","See who is growing with you","/vendor/sellers","♙"]].map(x=><NavLink className="feature-card" to={x[2]} key={x[0]}><span>{x[3]}</span><div><b>{x[0]}</b><p>{x[1]}</p></div><strong>→</strong></NavLink>)}</div></Card><Card><Head kicker="BUSINESS CONTROL" title="Keep the operation clean"/><div className="shortcut-grid">{[["Shipping","Courier and fulfillment setup","/vendor/shipping"],["Wallet","Settlements and receivables","/vendor/wallet"],["KYC","Business verification","/vendor/kyc"],["Reports","Sales and inventory intelligence","/vendor/reports"]].map(x=><NavLink className="shortcut" to={x[2]} key={x[0]}><b>{x[0]}</b><span>{x[1]}</span><strong>→</strong></NavLink>)}</div></Card></div>
 <Card className="momentum-panel"><Head kicker="SELLER NETWORK" title="Your supply business grows when sellers succeed"/><div className="network-banner"><div><b>Turn great fulfillment into a vendor advantage.</b><p>Track seller adoption, product demand, stock reliability and service quality from one place.</p></div><NavLink className="btn primary" to="/vendor/sellers">Open seller network →</NavLink></div></Card>
 </AppShell>
}
export function ProfitCalculator(){
 const [f,setF]=useState({cost:500,sell:999,shipping:80,cod:30,gateway:20,rto:60,other:10});const set=(k,v)=>setF({...f,[k]:Number(v)});const gross=f.sell-f.cost;const net=gross-f.shipping-f.cod-f.gateway-f.rto-f.other;const margin=f.sell?net/f.sell*100:0;
 return <AppShell role="seller" title="Profit Intelligence"><div className="calculator-grid"><Card><Head kicker="UNIT ECONOMICS" title="Profit calculator" text="Model the real contribution before you push a product."/><div className="calc-fields">{Object.entries({cost:"Vendor cost",sell:"Selling price",shipping:"Shipping cost",cod:"COD fee",gateway:"Payment fee",rto:"Expected RTO cost",other:"Other costs"}).map(([k,l])=><label key={k}>{l}<input type="number" value={f[k]} onChange={e=>set(k,e.target.value)}/></label>)}</div></Card><Card className="profit-result"><span className="section-kicker">ESTIMATED NET PROFIT</span><strong>{money(net)}</strong><div className="profit-ring"><b>{pct(margin)}%</b><span>net margin</span></div><div className="result-lines"><span>Gross profit <b>{money(gross)}</b></span><span>Cost load <b>{money(f.sell-net)}</b></span><span>Break-even price <b>{money(f.cost+f.shipping+f.cod+f.gateway+f.rto+f.other)}</b></span></div><p>Use this simulator before setting seller margin or pushing to Shopify.</p></Card></div></AppShell>
}

export function KycCenter({role="seller"}){const {session}=useAuth();const [f,setF]=useState({entity_type:"business",legal_name:"",business_name:"",gstin:"",phone:"",address:"",pincode:""});const [row,setRow]=useState(null),[msg,setMsg]=useState("");useEffect(()=>{if(session?.user?.id)supabase.from("kyc_profiles").select("*").eq("user_id",session.user.id).maybeSingle().then(({data})=>{if(data){setRow(data);setF(data)}})},[session?.user?.id]);async function save(e){e.preventDefault();const payload={...f,user_id:session.user.id,completion:Math.min(100,[f.legal_name,f.business_name,f.gstin,f.phone,f.address,f.pincode].filter(Boolean).length/6*100),status:"submitted"};const q=row?supabase.from("kyc_profiles").update(payload).eq("user_id",session.user.id):supabase.from("kyc_profiles").insert(payload);const {error}=await q;setMsg(error?error.message:"KYC submitted for review.");if(!error)setRow({...payload})}return <AppShell role={role} title="KYC & Verification"><div className="kyc-head"><div><span className="section-kicker">TRUST CENTER</span><h2>Get your {role} account verified.</h2><p>Complete business and payout details once; use the same verified identity across operations.</p></div><div className="kyc-score"><b>{Math.round(row?.completion||0)}%</b><span>complete</span></div></div><Card><form className="form-stack" onSubmit={save}><div className="form-row"><label>Legal name<input value={f.legal_name||""} onChange={e=>setF({...f,legal_name:e.target.value})}/></label><label>Business / store name<input value={f.business_name||""} onChange={e=>setF({...f,business_name:e.target.value})}/></label></div><div className="form-row"><label>GSTIN<input value={f.gstin||""} onChange={e=>setF({...f,gstin:e.target.value})}/></label><label>Phone<input value={f.phone||""} onChange={e=>setF({...f,phone:e.target.value})}/></label></div><label>Business address<textarea rows="3" value={f.address||""} onChange={e=>setF({...f,address:e.target.value})}/></label><label>Pincode<input value={f.pincode||""} onChange={e=>setF({...f,pincode:e.target.value})}/></label><div className="kyc-docs"><span>✓ Identity details</span><span>✓ Business details</span><span>○ PAN document</span><span>○ Bank proof</span></div><button className="btn primary">Save & submit KYC</button>{msg&&<div className="alert success">{msg}</div>}</form></Card></AppShell>
}

export function WalletCenter({role="seller"}){const {session}=useAuth();const [w,setW]=useState({available_balance:0,pending_balance:0,hold_balance:0});const [tx,setTx]=useState([]);useEffect(()=>{if(!session?.user?.id)return;Promise.all([supabase.from("wallet_accounts").select("*").eq("user_id",session.user.id).maybeSingle(),supabase.from("wallet_transactions").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false}).limit(20)]).then(([a,t])=>{setW(a.data||w);setTx(t.data||[])})},[session?.user?.id]);return <AppShell role={role} title="Wallet & Settlements"><div className="stats modern-stats"><Stat label="Available" value={money(w.available_balance)}/><Stat label="Pending" value={money(w.pending_balance)}/><Stat label="On hold" value={money(w.hold_balance)}/><Stat label="Total position" value={money(Number(w.available_balance)+Number(w.pending_balance)+Number(w.hold_balance))}/></div><div className="dashboard-grid"><Card><Head kicker="MONEY MOVEMENT" title="Transaction ledger" text="Every credit, debit and hold should be traceable."/><div className="mini-list">{tx.length?tx.map(x=><div className="list-item" key={x.id}><div><b>{x.description}</b><span>{new Date(x.created_at).toLocaleString("en-IN")}</span></div><strong className={x.type==="credit"?"ledger-credit":"ledger-debit"}>{x.type==="credit"?"+":"-"}{money(x.amount)}</strong></div>):<Empty title="Wallet is ready" text="Settlement transactions will appear here."/>}</div></Card><Card><Head kicker={role==="vendor"?"VENDOR SETTLEMENT":"SELLER MONEY"} title="Settlement rules"/><div className="rule-list"><span>Available balance → withdrawable</span><span>Pending balance → awaiting settlement</span><span>Hold balance → risk / exception reserve</span><span>COD margin → released after delivery and reconciliation</span></div></Card></div></AppShell>
}

export function ReportsCenter({role="seller"}){const {session}=useAuth();const [orders,setOrders]=useState([]);useEffect(()=>{if(!session?.user?.id)return;const q=role==="vendor"?supabase.from("orders").select("*").eq("vendor_id",session.user.id):supabase.from("orders").select("*").eq("seller_id",session.user.id);q.then(({data})=>setOrders(data||[]))},[session?.user?.id,role]);const total=orders.reduce((a,o)=>a+Number(o.amount||0),0),statuses=["pending","confirmed","packed","shipped","delivered","ndr","rto","cancelled"];return <AppShell role={role} title="Reports & Analytics"><div className="stats modern-stats"><Stat label="Orders" value={orders.length}/><Stat label="Order value" value={money(total)}/><Stat label="Delivered" value={orders.filter(o=>o.status==="delivered").length}/><Stat label="Exceptions" value={orders.filter(o=>["ndr","rto"].includes(o.status)).length}/></div><div className="dashboard-grid"><Card><Head kicker="ORDER FUNNEL" title="Fulfillment distribution"/><div className="bar-chart">{statuses.map(s=>{const n=orders.filter(o=>o.status===s).length;const h=orders.length?Math.max(8,n/orders.length*100):8;return <div className="bar-col" key={s}><div className="bar" style={{height:h+"%"}}/><b>{n}</b><span>{s}</span></div>})}</div></Card><Card><Head kicker="REPORT BUILDER" title="Export-ready views"/><div className="report-list">{["Sales summary","Product performance","Order status","Shipping performance","NDR / RTO","Wallet & settlements"].map(x=><div className="report-row" key={x}><div><b>{x}</b><span>Live data · filtered to your account</span></div><button className="btn secondary" onClick={()=>alert("Report export can be connected to CSV generation next.")}>Export</button></div>)}</div></Card></div></AppShell>
}

export function VendorImport(){
 const {session}=useAuth();const [rows,setRows]=useState([]),[msg,setMsg]=useState("");const sample="title,sku,category,description,cost_price,stock,image_url,status\nPortable Mini Blender,BI-1001,Kitchen,Rechargeable blender,499,100,https://example.com/blender.jpg,active\n";function download(){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([sample],{type:"text/csv"}));a.download="bucket-india-product-sample.csv";a.click()}function parse(text){const [head,...lines]=text.trim().split(/\r?\n/);const keys=head.split(",").map(x=>x.trim());setRows(lines.filter(Boolean).map(line=>Object.fromEntries(line.split(",").map((v,i)=>[keys[i],v.trim()]))))}async function importRows(){const {data:v}=await supabase.from("vendors").select("id").eq("owner_id",session.user.id).maybeSingle();if(!v)return setMsg("Vendor profile not found.");const payload=rows.filter(r=>r.title).map(r=>({vendor_id:v.id,title:r.title,sku:r.sku||null,category:r.category||"General",description:r.description||null,cost_price:Number(r.cost_price||0),stock:Number(r.stock||0),image_url:r.image_url||null,status:r.status||"active"}));const {error}=await supabase.from("products").insert(payload);setMsg(error?error.message:payload.length+" products imported successfully.");if(!error)setRows([])}return <AppShell role="vendor" title="Import Products"><div className="import-hero"><div><span className="section-kicker">BULK CATALOG</span><h2>Upload once. Publish hundreds.</h2><p>Start with our sample sheet, prepare your catalog, preview rows and import into the vendor marketplace.</p></div><button className="btn primary" onClick={download}>Download sample CSV ↓</button></div><Card><div className="drop-zone"><input type="file" accept=".csv,.txt" onChange={e=>{const f=e.target.files?.[0];if(f){const r=new FileReader();r.onload=()=>parse(String(r.result));r.readAsText(f)}}}/><b>Drop your CSV here or choose a file</b><span>Columns: title, SKU, category, description, cost, stock, image URL, status</span></div>{rows.length>0&&<><div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]).map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{rows.slice(0,8).map((r,i)=><tr key={i}>{Object.keys(rows[0]).map(k=><td key={k}>{r[k]}</td>)}</tr>)}</tbody></table></div><button className="btn primary" onClick={importRows}>Import {rows.length} products ↗</button></>}{msg&&<div className="alert success">{msg}</div>}</Card></AppShell>
}

export function FeaturePage({role,title,description,children}){return <AppShell role={role} title={title}><Card><Head kicker="BUCKET INDIA OS" title={title} text={description}/>{children||<div className="empty"><div className="empty-icon">✦</div><h3>Workspace ready</h3><p>This module is connected to the new platform architecture.</p></div>}</Card></AppShell>}

export function CustomerCenter(){
 const {session}=useAuth(); const [orders,setOrders]=useState([]);
 useEffect(()=>{if(session?.user?.id)supabase.from("orders").select("*").eq("seller_id",session.user.id).order("created_at",{ascending:false}).then(({data})=>setOrders(data||[]))},[session?.user?.id]);
 const map={}; orders.forEach(o=>{const k=o.customer_phone||o.customer_name||"Customer";if(!map[k])map[k]={name:o.customer_name||"Customer",phone:o.customer_phone||"—",orders:0,value:0,rto:0,last:o.created_at};map[k].orders++;map[k].value+=Number(o.amount||0);if(o.status==="rto")map[k].rto++});
 const customers=Object.values(map).sort((a,b)=>b.value-a.value);
 return <AppShell role="seller" title="Customer Intelligence"><section className="command-hero customer-hero"><div><span className="hero-kicker">CUSTOMER 360</span><h2>Know the people behind <span>every order.</span></h2><p>Turn order history into customer intelligence: repeat buyers, lifetime value and delivery behaviour.</p></div><div className="hero-mini-stat"><b>{customers.length}</b><span>unique customers</span></div></section><div className="stats modern-stats"><Stat label="Customers" value={customers.length}/><Stat label="Repeat buyers" value={customers.filter(x=>x.orders>1).length}/><Stat label="Customer value" value={money(customers.reduce((a,x)=>a+x.value,0))}/><Stat label="At-risk profiles" value={customers.filter(x=>x.rto>0).length}/></div><Card><Head kicker="CUSTOMER 360" title="Customer portfolio" text="Sort and act on lifetime value and delivery history."/><div className="customer-grid">{customers.length?customers.slice(0,30).map((x,i)=><div className="customer-card" key={x.phone+i}><div className="customer-avatar">{x.name.slice(0,1).toUpperCase()}</div><div><b>{x.name}</b><span>{x.phone}</span><small>{x.orders} order{x.orders!==1?"s":""} · Last {new Date(x.last).toLocaleDateString("en-IN")}</small></div><strong>{money(x.value)}</strong><em className={x.rto?"risk":"good"}>{x.rto?x.rto+" RTO":"Healthy"}</em></div>):<Empty title="Customer intelligence is waiting" text="Your Shopify orders will build customer profiles here."/>}</div></Card></AppShell>
}

export function StoreHealth(){
 const {session}=useAuth(); const [orders,setOrders]=useState([]),[stores,setStores]=useState([]),[listings,setListings]=useState([]);
 useEffect(()=>{if(!session?.user?.id)return;Promise.all([supabase.from("orders").select("*").eq("seller_id",session.user.id),supabase.from("stores").select("*").eq("seller_id",session.user.id),supabase.from("listings").select("*").eq("seller_id",session.user.id)]).then(([o,s,l])=>{setOrders(o.data||[]);setStores(s.data||[]);setListings(l.data||[])})},[session?.user?.id]);
 const delivered=orders.filter(x=>x.status==="delivered").length,exceptions=orders.filter(x=>["ndr","rto"].includes(x.status)).length;const metrics=[["Delivery",orders.length?Math.round(delivered/orders.length*100):0,"Successful delivery rate"],["Channel",stores.length?100:18,"Shopify connectivity"],["Catalog",listings.length?88:12,"Products ready to sell"],["Risk",Math.max(12,90-exceptions*5),"Exception control"]];
 const score=Math.round(metrics.reduce((a,x)=>a+x[1],0)/4);
 return <AppShell role="seller" title="Store Health"><section className="health-command"><div><span className="hero-kicker">BUSINESS HEALTH</span><h2>{score}<small>/100</small></h2><p>A single operating score built from delivery, channel, catalog and risk signals.</p></div><div className="health-ring big" style={{"--score":score+"%"}}><b>{score}</b><span>health</span></div></section><div className="health-metric-grid">{metrics.map(x=><Card key={x[0]}><div className="metric-top"><span>{x[0]}</span><b>{x[1]}%</b></div><div className="progress"><i style={{width:x[1]+"%"}}/></div><p>{x[2]}</p></Card>)}</div><Card><Head kicker="NEXT BEST ACTIONS" title="Improve the score"/><div className="action-list">{[[!stores.length,"Connect your Shopify store","/seller/stores"],[!listings.length,"Launch your first catalog product","/seller/products"],[exceptions>0,"Resolve active NDR / RTO","/seller/ndr"],[orders.length<10,"Reach your first 10 delivered orders","/seller/orders"]].filter(x=>x[0]).map((x,i)=><NavLink className="action-row" to={x[2]} key={i}><i>{i+1}</i><span>{x[1]}</span><strong>Fix it →</strong></NavLink>)}</div></Card></AppShell>
}
