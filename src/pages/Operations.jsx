import {useEffect,useMemo,useState} from "react";
import AppShell,{Empty,Stat} from "../components/AppShell";
import {useAuth} from "../context/AuthContext";
import {supabase} from "../lib/supabase";
import {CalendarBlank,CheckCircle,ChartLineUp,Clock,Coins,DownloadSimple,Funnel,MagnifyingGlass,Lightning,MapPin,Package,Percent,ShoppingCart,Storefront,Truck,WarningCircle,TrendUp,CreditCard,CaretDown,Check} from "@phosphor-icons/react";

const money=n=>`₹${Number(n||0).toLocaleString("en-IN",{maximumFractionDigits:2})}`;
const statusClass=s=>`status-pill ${s||""}`;
const sellerTabs=["all","pending","confirmed","packed","shipped","delivered","ndr","rto","cancelled"];
const vendorTabs=["all","confirmed","packed","shipped","ndr","delivered","rto","cancelled"];

function useOrders(role){
 const {session}=useAuth(); const [rows,setRows]=useState([]),[loading,setLoading]=useState(true);
 async function load(){
  if(!session?.user?.id)return;
  setLoading(true);
  let q=supabase.from("orders").select("*, listings(product_id, store_id, products(title, sku, image_url)), shipments(*), ndr_cases(*), remittances(*)").order("created_at",{ascending:false});
  if(role==="seller")q=q.eq("seller_id",session.user.id);else{
   const {data:v}=await supabase.from("vendors").select("id").eq("owner_id",session.user.id).maybeSingle();
   q=v?q.eq("vendor_id",v.id).in("status",["confirmed","packed","shipped","out_for_delivery","delivered","ndr","rto","cancelled"]):q.eq("vendor_id","00000000-0000-0000-0000-000000000000");
  }
  const {data,error}=await q; if(!error)setRows(data||[]); setLoading(false);
 }
 useEffect(()=>{load(); if(!session?.user?.id)return;
  const channel=supabase.channel(`bucket-${role}-orders-${session.user.id}`).on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"shipments"},()=>load()).on("postgres_changes",{event:"*",schema:"public",table:"ndr_cases"},()=>load()).subscribe();
  return()=>{supabase.removeChannel(channel)};
 },[session?.user?.id,role]);
 return {rows,loading,load};
}

const orderTabs=["all","cod","prepaid","confirmed","cancelled","unprocessable","error"];
function orderPayment(o){return String(o.payment_method||"cod").toLowerCase().includes("pre")?"prepaid":"cod"}
function orderTabMatch(o,tab){if(tab==="all")return true;if(tab==="cod"||tab==="prepaid")return orderPayment(o)===tab;if(tab==="confirmed")return ["confirmed","packed","shipped","delivered","ndr","rto"].includes(o.status);if(tab==="cancelled")return o.status==="cancelled";if(tab==="unprocessable")return o.status==="unprocessable";if(tab==="error")return !!o.error_message;return true}
function OrderFilters({search,setSearch,filters,setFilters,stores,tab,setTab}){const [storeOpen,setStoreOpen]=useState(false),[payOpen,setPayOpen]=useState(false);useEffect(()=>{const close=e=>{if(!e.target.closest(".order-filter-select")){setStoreOpen(false);setPayOpen(false)}};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);const store=stores.find(x=>x.id===filters.store);return <><div className="orders-filter-panel"><div className="orders-search"><Funnel size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Shopify order, Order ID, customer, mobile"/></div><label className="orders-date"><CalendarBlank size={15}/><span>FROM</span><input type="date" value={filters.from} onChange={e=>setFilters(x=>({...x,from:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label><label className="orders-date"><span>TO</span><input type="date" value={filters.to} onChange={e=>setFilters(x=>({...x,to:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label><div className="order-filter-select"><span>PAYMENT</span><button onClick={()=>setPayOpen(v=>!v)}>{filters.payment==="all"?"All payments":filters.payment==="cod"?"COD":"Prepaid"}<CaretDown size={14}/></button>{payOpen&&<div className="order-filter-menu">{[["all","All payments"],["cod","COD"],["prepaid","Prepaid"]].map(([v,l])=><button key={v} className={filters.payment===v?"selected":""} onClick={()=>{setFilters(x=>({...x,payment:v}));setPayOpen(false)}}>{l}{filters.payment===v&&<Check size={13}/>}</button>)}</div>}</div><div className="order-filter-select"><span>STORE</span><button onClick={()=>setStoreOpen(v=>!v)}>{store?.name||store?.shop_domain||"All stores"}<CaretDown size={14}/></button>{storeOpen&&<div className="order-filter-menu">{[["all","All stores"],...stores.map(x=>[x.id,x.name||x.shop_domain||"Shopify store"])].map(([v,l])=><button key={v} className={filters.store===v?"selected":""} onClick={()=>{setFilters(x=>({...x,store:v}));setStoreOpen(false)}}>{l}{filters.store===v&&<Check size={13}/>}</button>)}</div>}</div><button className="orders-reset" onClick={()=>{setSearch("");setFilters({from:"",to:"",payment:"all",store:"all"})}}>Reset</button></div><div className="orders-tabs">{orderTabs.map(t=><button key={t} className={tab===t?"active "+t:t} onClick={()=>setTab(t)}>{t==="all"?"All":t==="unprocessable"?"Unprocessable":t[0].toUpperCase()+t.slice(1)}</button>)}</div></>}
function OrderEditModal({order,onClose,onSaved}){const [form,setForm]=useState({customer_name:order.customer_name||"",customer_phone:order.customer_phone||"",amount:order.amount||"",shipping_address:JSON.stringify(order.shipping_address||{},null,2)}),[busy,setBusy]=useState(false);async function save(){setBusy(true);let address;try{address=form.shipping_address?JSON.parse(form.shipping_address):{}}catch(e){alert("Shipping address must be valid JSON.");setBusy(false);return}const {error}=await supabase.from("orders").update({customer_name:form.customer_name,customer_phone:form.customer_phone,amount:Number(form.amount||0),shipping_address:address,updated_at:new Date().toISOString()}).eq("id",order.id);setBusy(false);if(error)alert(error.message);else{onSaved();onClose()}}return <div className="order-modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="order-edit-modal"><div className="order-modal-head"><div><span>EDIT ORDER</span><h2>#{order.external_order_id||order.id.slice(0,8)}</h2></div><button onClick={onClose}>×</button></div><div className="order-edit-body"><label>Customer name<input value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/></label><label>Mobile<input value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})}/></label><label>Order value<input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Shipping address JSON<textarea rows="7" value={form.shipping_address} onChange={e=>setForm({...form,shipping_address:e.target.value})}/></label></div><div className="order-modal-foot"><button className="btn" onClick={onClose}>Close</button><button className="btn primary" disabled={busy} onClick={save}>{busy?"Saving…":"Save changes"}</button></div></aside></div>}
function OrderTable({rows,role,onChanged,selected,setSelected,onEdit}){const [busy,setBusy]=useState("");async function update(id,patch){setBusy(id);const {error}=await supabase.from("orders").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);setBusy("");if(error)alert(error.message);else onChanged()}async function sellerConfirm(o){await update(o.id,{status:"confirmed",confirmed_at:new Date().toISOString(),error_message:null})}async function cancel(o){if(!window.confirm("Cancel this order?"))return;await update(o.id,{status:"cancelled",cancelled_at:new Date().toISOString()})}return <div className="orders-table-shell"><table className="orders-table"><thead><tr><th className="check-col"><input type="checkbox" checked={rows.length>0&&rows.every(o=>selected.includes(o.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...rows.map(o=>o.id)])]:selected.filter(id=>!rows.some(o=>o.id===id)))}/></th><th>Order date</th><th>Shopify Order ID</th><th>Order ID</th><th>Error</th><th>Price</th><th>Payment</th><th>Customer details</th><th>Mobile</th><th>Store</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td><input type="checkbox" checked={selected.includes(o.id)} onChange={e=>setSelected(e.target.checked?[...selected,o.id]:selected.filter(id=>id!==o.id))}/></td><td><b>{new Date(o.created_at).toLocaleDateString("en-IN")}</b><small>{new Date(o.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</small></td><td><b className="shopify-order-id">#{o.external_order_id||"—"}</b><small>Shopify</small></td><td><b>{o.id.slice(0,10)}…</b><small>Bucket India</small></td><td>{o.error_message?<span className="order-error"><WarningCircle size={14}/>{o.error_message}</span>:<span className="no-error">—</span>}</td><td><strong>{money(o.amount)}</strong><small>{o.quantity||1} item{o.quantity===1?"":"s"}</small></td><td><span className={"payment-chip "+orderPayment(o)}>{orderPayment(o).toUpperCase()}</span></td><td><b>{o.customer_name||"Customer"}</b><small>{typeof o.shipping_address==="object"&&o.shipping_address?.city?o.shipping_address.city:"Address available"}</small></td><td>{o.customer_phone||"—"}</td><td><span className="store-chip">{o.store_name||o.shop_domain||"Shopify store"}</span></td><td><span className={statusClass(o.status)}>{o.status||"pending"}</span></td><td><div className="order-actions">{role==="seller"&&o.status==="pending"&&<button className="btn primary compact" disabled={busy===o.id} onClick={()=>sellerConfirm(o)}>{busy===o.id?"…":"Confirm"}</button>}{role==="seller"&&["pending","unprocessable"].includes(o.status)&&<button className="btn danger compact" disabled={busy===o.id} onClick={()=>cancel(o)}>Cancel</button>}{role==="seller"&&<button className="btn compact" onClick={()=>onEdit(o)}>Edit</button>}{role==="vendor"&&<VendorAction o={o} busy={busy===o.id} onChange={st=>update(o.id,{status:st})}/>}</div></td></tr>)}</tbody></table></div>}
export function SellerOrders(){const d=useOrders("seller"),[tab,setTab]=useState("all"),[search,setSearch]=useState(""),[stores,setStores]=useState([]),[filters,setFilters]=useState({from:"",to:"",payment:"all",store:"all"}),[selected,setSelected]=useState([]),[edit,setEdit]=useState(null);useEffect(()=>{if(!d.rows.length)return;const ids=[...new Set(d.rows.map(o=>o.store_id||o.listings?.store_id).filter(Boolean))];if(!ids.length)return;supabase.from("stores").select("id,name,shop_domain").in("id",ids).then(({data})=>setStores(data||[]))},[d.rows]);const rows=useMemo(()=>d.rows.filter(o=>{const day=new Date(o.created_at).toISOString().slice(0,10);const sid=o.store_id||o.listings?.store_id;const q=((o.external_order_id||"")+" "+o.id+" "+(o.customer_name||"")+" "+(o.customer_phone||"")+" "+(o.error_message||"")).toLowerCase();return orderTabMatch(o,tab)&&(!search||q.includes(search.toLowerCase()))&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(filters.payment==="all"||orderPayment(o)===filters.payment)&&(filters.store==="all"||sid===filters.store)}),[d.rows,tab,search,filters]);const stats={all:d.rows.length,cod:d.rows.filter(o=>orderPayment(o)==="cod").length,prepaid:d.rows.filter(o=>orderPayment(o)==="prepaid").length,confirmed:d.rows.filter(o=>["confirmed","packed","shipped","delivered","ndr","rto"].includes(o.status)).length,cancelled:d.rows.filter(o=>o.status==="cancelled").length,unprocessable:d.rows.filter(o=>o.status==="unprocessable").length,error:d.rows.filter(o=>!!o.error_message).length};const exportRows=rows.filter(o=>!selected.length||selected.includes(o.id));function exportCsv(){const head=["Order date","Shopify Order ID","Order ID","Error","Price","Payment","Customer","Mobile","Store","Status"];const body=exportRows.map(o=>[new Date(o.created_at).toISOString(),o.external_order_id||"",o.id,o.error_message||"",o.amount||0,orderPayment(o),o.customer_name||"",o.customer_phone||"",o.store_name||"",o.status||""]);const csv=[head,...body].map(r=>r.map(v=>String.fromCharCode(34)+String(v).replaceAll(String.fromCharCode(34),String.fromCharCode(34)+String.fromCharCode(34))+String.fromCharCode(34)).join(",")).join(String.fromCharCode(10));const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bucket-india-orders.csv";a.click();URL.revokeObjectURL(a.href)}return <AppShell role="seller" title="Orders"><section className="orders-hero-v2"><div><span className="section-kicker">SHOPIFY ORDER CONTROL</span><h2>Every order. <em>One decision gate.</em></h2><p>Shopify orders sync here first. COD and prepaid orders remain with you until you confirm them. Only confirmed orders move to the vendor.</p></div><div className="orders-flow"><span>SHOPIFY</span><i>→</i><b>SELLER</b><i>→</i><span>VENDOR</span></div></section><div className="orders-kpis">{[["all","Total orders","Synced from Shopify"],["cod","COD","Cash on delivery"],["prepaid","Prepaid","Online paid"],["confirmed","Confirmed","Seller approved"],["cancelled","Cancelled","Stopped"],["error","Errors","Needs attention"]].map(([k,l,h])=><div className={"order-kpi "+k} key={k}><span>{l}</span><strong>{stats[k]}</strong><small>{h}</small></div>)}</div><section className="panel orders-panel"><OrderFilters search={search} setSearch={setSearch} filters={filters} setFilters={setFilters} stores={stores} tab={tab} setTab={setTab}/><div className="orders-table-toolbar"><div><b>{rows.length}</b> orders <span>{selected.length?selected.length+" selected":""}</span></div><div className="orders-export-actions"><button className="btn compact" onClick={exportCsv}><DownloadSimple size={15}/> Export CSV</button><button className="btn compact" onClick={()=>window.print()}><DownloadSimple size={15}/> Print / Export</button></div></div>{rows.length?<OrderTable rows={rows} role="seller" onChanged={d.load} selected={selected} setSelected={setSelected} onEdit={setEdit}/>:<Empty title={d.loading?"Loading orders…":"No matching orders"} text="Shopify-synced orders will appear here. Seller confirmation is required before vendor fulfillment."/>}</section>{edit&&<OrderEditModal order={edit} onClose={()=>setEdit(null)} onSaved={d.load}/>}</AppShell>}
export function VendorOrders(){const d=useOrders("vendor"),[tab,setTab]=useState("all"),[search,setSearch]=useState("");const rows=useMemo(()=>d.rows.filter(o=>(tab==="all"||o.status===tab)&&((o.external_order_id||"")+" "+(o.customer_name||"")+" "+(o.customer_phone||"")+" "+(o.awb||"")+" "+(o.shipments?.[0]?.awb||"")).toLowerCase().includes(search.toLowerCase())),[d.rows,tab,search]);const stats=sellerOrderStats(d.rows);return <AppShell role="vendor" title="Orders"><div className="ops-hero vendor"><div><span className="section-kicker">VENDOR FULFILLMENT CONTROL</span><h2>Confirmed orders are <span>your queue.</span></h2><p>Only Seller-confirmed orders enter this workspace. Shipments, NDR, RTO and delivery events flow back to the seller in real time.</p></div><div className="ops-orbit">SYNC</div></div><div className="stats ops-stats"><Stat label="Confirmed queue" value={stats.confirmed}/><Stat label="In transit" value={stats.inTransit}/><Stat label="NDR" value={stats.ndr}/><Stat label="Delivered" value={stats.delivered}/><Stat label="COD margin due" value={money(stats.margin)}/></div><section className="panel"><Filters search={search} setSearch={setSearch} tab={tab} setTab={setTab} tabs={vendorTabs}/>{rows.length?<OrderTable rows={rows} role="vendor" onChanged={d.load}/>:<Empty title={d.loading?"Loading vendor queue…":"No orders in this queue"} text="A Seller must confirm an order before it becomes visible to the vendor."/>}</section></AppShell>}

export function ShipmentCenter({role="seller"}){
 const d=useOrders(role),[tab,setTab]=useState("all"),[search,setSearch]=useState(""),[stores,setStores]=useState([]),[filters,setFilters]=useState({from:"",to:"",payment:"all",store:"all"}),[selected,setSelected]=useState([]);
 useEffect(()=>{const ids=[...new Set(d.rows.map(o=>o.store_id||o.listings?.store_id).filter(Boolean))];if(!ids.length){setStores([]);return}supabase.from("stores").select("id,store_name,shop_domain").in("id",ids).then(({data})=>setStores(data||[]))},[d.rows]);
 const storeMap=useMemo(()=>Object.fromEntries(stores.map(s=>[s.id,s])),[stores]);
 const shipmentRows=useMemo(()=>d.rows.flatMap(o=>(o.shipments||[]).map(s=>({...s,order:o,store:storeMap[o.store_id||o.listings?.store_id]||null}))),[d.rows,storeMap]);
 const tabMatch=(s,t)=>t==="all"?true:t==="pickups"?["ready","booked"].includes(s.status):t==="in_transit"?s.status==="shipped":t==="out_for_delivery"?s.status==="out_for_delivery":t==="rto"?s.status==="rto":t==="cancelled"?s.status==="cancelled":true;
 const rows=useMemo(()=>shipmentRows.filter(s=>{const o=s.order||{},sid=o.store_id||o.listings?.store_id,day=new Date(o.created_at).toISOString().slice(0,10),q=[o.external_order_id,o.id,s.awb,s.courier,o.customer_name,o.customer_phone,o.listings?.products?.title,s.store?.store_name,s.store?.shop_domain].filter(Boolean).join(" ").toLowerCase();return tabMatch(s,tab)&&(!search||q.includes(search.toLowerCase()))&&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(filters.payment==="all"||String(o.payment_method||"cod")===filters.payment)&&(filters.store==="all"||sid===filters.store)}),[shipmentRows,tab,search,filters]);
 const stats=useMemo(()=>({total:shipmentRows.length,pickups:shipmentRows.filter(s=>["ready","booked"].includes(s.status)).length,inTransit:shipmentRows.filter(s=>s.status==="shipped").length,out:shipmentRows.filter(s=>s.status==="out_for_delivery").length,delivered:shipmentRows.filter(s=>s.status==="delivered").length,rto:shipmentRows.filter(s=>s.status==="rto").length,cancelled:shipmentRows.filter(s=>s.status==="cancelled").length}),[shipmentRows]);
 const reset=()=>{setSearch("");setFilters({from:"",to:"",payment:"all",store:"all"})};
 function exportCsv(){const exportRows=rows.filter(s=>!selected.length||selected.includes(s.id));const head=["Order date","Order confirmed","AWB Number","Pickup date","Shopify Order ID","Order ID","Price","Margin","Payment Mode","Customer Name","Address","Number","Product Details","Store Name","Courier","Status"];const body=exportRows.map(s=>{const o=s.order||{},a=o.shipping_address||{},p=o.listings?.products||{};return[o.created_at||"",o.confirmed_at||"",s.awb||"",s.pickup_at||s.created_at||"",o.external_order_id||"",o.id,o.amount||0,o.seller_margin||0,String(o.payment_method||"cod").toUpperCase(),o.customer_name||"",[a.address1||a.address||a.street,a.address2,a.city,a.state,a.pincode||a.zip].filter(Boolean).join(", "),o.customer_phone||"",[p.title,p.sku,o.quantity?("Qty "+o.quantity):""].filter(Boolean).join(" • "),s.store?.store_name||s.store?.shop_domain||"",s.courier||"",s.status||""]});const csv=[head,...body].map(r=>r.map(v=>String.fromCharCode(34)+String(v).replaceAll(String.fromCharCode(34),String.fromCharCode(34)+String.fromCharCode(34))+String.fromCharCode(34)).join(",")).join(String.fromCharCode(10));const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bucket-india-shipments.csv";a.click();URL.revokeObjectURL(a.href)}
 async function updateShipment(s,status){if(role!=="vendor")return;const now=new Date().toISOString(),patch={status,updated_at:now};if(status==="booked"&&!s.pickup_at)patch.pickup_at=now;if(status==="shipped")patch.shipped_at=now;if(status==="out_for_delivery"&&!s.shipped_at)patch.shipped_at=now;if(status==="delivered")patch.delivered_at=now;if(status==="rto")patch.rto_at=now;const {error}=await supabase.from("shipments").update(patch).eq("id",s.id);if(!error&&status==="delivered")await supabase.from("orders").update({status:"delivered",delivered_at:now,last_event_at:now}).eq("id",s.order.id);if(!error&&status==="rto")await supabase.from("orders").update({status:"rto",rto_at:now,last_event_at:now}).eq("id",s.order.id);if(!error&&status==="cancelled")await supabase.from("orders").update({status:"cancelled",cancelled_at:now,last_event_at:now}).eq("id",s.order.id);if(error)alert(error.message);else d.load()}
 const address=o=>{const a=o.shipping_address||{};return[a.address1||a.address,a.address2,a.city,a.state,a.pincode||a.zip].filter(Boolean).join(", ")||"Address available"};
 const stageLabel=s=>({ready:"Pickup ready",booked:"Pickup booked",shipped:"In transit",out_for_delivery:"Out for delivery",ndr:"NDR",delivered:"Delivered",rto:"RTO",cancelled:"Cancelled"}[s.status]||s.status||"—");
 const productLabel=o=>{const p=o.listings?.products||{};return[p.title,p.sku,o.quantity?("Qty "+o.quantity):""].filter(Boolean).join(" • ")||"Product details unavailable"};
 const tabs=[["pickups","Pickups"],["in_transit","In-Transit"],["out_for_delivery","Out for delivery"],["rto","RTO"],["cancelled","Cancelled"],["all","All"]];
 return <AppShell role={role} title="Shipments"><section className="shipments-hero"><div><span className="section-kicker">DELIVERY CONTROL TOWER</span><h2>Every parcel. <em>Every mile.</em></h2><p>Track seller-confirmed orders from pickup through delivery, NDR and RTO. Vendor updates are mirrored here so the seller always sees the live delivery journey.</p></div><div className="shipments-hero-orbit"><Truck size={30}/><span>LIVE<br/>JOURNEY</span></div></section><div className="shipments-kpis">{[["total","Total shipments",stats.total,"All journeys"],["pickups","Pickups",stats.pickups,"Ready / booked"],["inTransit","In transit",stats.inTransit,"Courier movement"],["out","Out for delivery",stats.out,"Final-mile"],["delivered","Delivered",stats.delivered,"Completed"],["rto","RTO",stats.rto,"Returning"]].map(([key,label,value,hint])=><div className={"shipment-kpi "+key} key={key}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>)}</div><section className="panel shipments-panel"><div className="shipments-filter-panel"><div className="shipments-search"><MagnifyingGlass size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search AWB, Shopify order, Order ID, customer, mobile"/></div><label className="shipments-date"><CalendarBlank size={15}/><span>FROM</span><input type="date" value={filters.from} onChange={e=>setFilters(x=>({...x,from:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label><label className="shipments-date"><span>TO</span><input type="date" value={filters.to} onChange={e=>setFilters(x=>({...x,to:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label><div className="shipment-select"><span>PAYMENT</span><select value={filters.payment} onChange={e=>setFilters(x=>({...x,payment:e.target.value}))}><option value="all">All payments</option><option value="cod">COD</option><option value="prepaid">Prepaid</option></select></div><div className="shipment-select"><span>STORE</span><select value={filters.store} onChange={e=>setFilters(x=>({...x,store:e.target.value}))}><option value="all">All stores</option>{stores.map(s=><option value={s.id} key={s.id}>{s.store_name||s.shop_domain||"Shopify store"}</option>)}</select></div><button className="shipments-reset" onClick={reset}>Reset</button></div><div className="shipments-tabs">{tabs.map(([value,label])=><button key={value} className={tab===value?"active "+value:""} onClick={()=>setTab(value)}>{label}<b>{value==="all"?stats.total:value==="pickups"?stats.pickups:value==="in_transit"?stats.inTransit:value==="out_for_delivery"?stats.out:value==="rto"?stats.rto:stats.cancelled}</b></button>)}</div><div className="shipments-toolbar"><div><b>{rows.length}</b> shipments <span>{selected.length?selected.length+" selected":""}</span></div><div className="shipments-export"><button className="btn compact" onClick={exportCsv}><DownloadSimple size={15}/> Export CSV</button><button className="btn compact" onClick={()=>window.print()}><DownloadSimple size={15}/> Print / Export</button></div></div><div className="shipments-table-shell"><table className="shipments-table"><thead><tr><th className="check-col"><input type="checkbox" checked={rows.length>0&&rows.every(s=>selected.includes(s.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...rows.map(s=>s.id)])]:selected.filter(id=>!rows.some(s=>s.id===id)))}/></th><th>Order date</th><th>Order confirm date</th><th>AWB Number</th><th>Pickup date</th><th>Shopify order ID</th><th>Order ID</th><th>Price</th><th>Margin</th><th>Payment Mode</th><th>Customer details</th><th>Name</th><th>Address</th><th>Number</th><th>Product details</th><th>Store Name</th><th>Courier</th><th>Journey status</th>{role==="vendor"&&<th>Action</th>}</tr></thead><tbody>{rows.map(s=>{const o=s.order||{},selectedRow=selected.includes(s.id);return <tr key={s.id}><td><input type="checkbox" checked={selectedRow} onChange={e=>setSelected(e.target.checked?[...selected,s.id]:selected.filter(id=>id!==s.id))}/></td><td><b>{new Date(o.created_at).toLocaleDateString("en-IN")}</b><small>{new Date(o.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</small></td><td>{o.confirmed_at?<><b>{new Date(o.confirmed_at).toLocaleDateString("en-IN")}</b><small>{new Date(o.confirmed_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</small></>:"—"}</td><td><b className="shipment-awb">{s.awb||"Pending"}</b><small>{s.courier||"Courier pending"}</small></td><td>{(s.pickup_at||s.created_at)?new Date(s.pickup_at||s.created_at).toLocaleDateString("en-IN"):"—"}</td><td><b className="shipment-shopify">#{o.external_order_id||"—"}</b></td><td><b>{o.id.slice(0,10)}…</b></td><td><strong>{money(o.amount)}</strong><small>{o.quantity||1} item{o.quantity===1?"":"s"}</small></td><td><strong className="shipment-margin">{money(o.seller_margin)}</strong></td><td><span className={"payment-chip "+(o.payment_method||"cod")}>{String(o.payment_method||"cod").toUpperCase()}</span></td><td><span className="customer-badge">{o.customer_name||"Customer"}</span></td><td>{o.customer_name||"—"}</td><td><span className="shipment-address">{address(o)}</span></td><td>{o.customer_phone||"—"}</td><td><span className="shipment-product">{productLabel(o)}</span></td><td><span className="store-chip">{s.store?.store_name||s.store?.shop_domain||"Shopify store"}</span></td><td>{s.courier||"—"}</td><td><span className={statusClass(s.status)}>{stageLabel(s)}</span></td>{role==="vendor"&&<td><div className="shipment-actions-inline">{s.status==="ready"&&<button className="btn primary compact" onClick={()=>updateShipment(s,"booked")}>Book pickup</button>}{s.status==="booked"&&<button className="btn primary compact" onClick={()=>updateShipment(s,"shipped")}>Mark shipped</button>}{s.status==="shipped"&&<button className="btn primary compact" onClick={()=>updateShipment(s,"out_for_delivery")}>Out for delivery</button>}{s.status==="out_for_delivery"&&<button className="btn primary compact" onClick={()=>updateShipment(s,"delivered")}>Delivered</button>}{["shipped","out_for_delivery"].includes(s.status)&&<button className="btn danger compact" onClick={()=>updateShipment(s,"rto")}>RTO</button>}</div></td>} </tr>})}</tbody></table></div>{!rows.length&&<div className="table-empty-state"><Empty title={d.loading?"Loading shipments…":"No matching shipments"} text="Seller-confirmed orders will appear here as the vendor moves them through the delivery journey."/></div>}</section></AppShell>
}
export function NdrCenter({role="seller"}){
 const d=useOrders(role),
   [tab,setTab]=useState("action"),
   [search,setSearch]=useState(""),
   [stores,setStores]=useState([]),
   [filters,setFilters]=useState({from:"",to:"",payment:"all",store:"all"});

 useEffect(()=>{
   const ids=[...new Set(d.rows.map(o=>o.store_id||o.listings?.store_id).filter(Boolean))];
   if(!ids.length){setStores([]);return}
   supabase.from("stores").select("*").in("id",ids).then(({data})=>setStores(data||[]));
 },[d.rows]);

 const storeMap=useMemo(()=>Object.fromEntries(stores.map(s=>[s.id,s])),[stores]);

 const records=useMemo(()=>{
   return d.rows.flatMap(o=>{
     const shipment=o.shipments?.[0]||{};
     const cases=o.ndr_cases||[];
     const base={order:o,shipment,store:storeMap[o.store_id||o.listings?.store_id]||null};
     if(cases.length)return cases.map(n=>({...base,case:n,kind:"ndr"}));
     if(["ndr","rto"].includes(shipment.status)||o.status==="rto")return [{...base,case:null,kind:shipment.status==="rto"||o.status==="rto"?"rto":"ndr"}];
     return [];
   });
 },[d.rows,storeMap]);

 const getStoreName=r=>r.store?.store_name||r.store?.name||r.store?.shop_domain||r.order?.store_name||r.order?.shop_domain||"Shopify store";
 const payment=o=>String(o?.payment_method||"cod").toLowerCase().includes("pre")?"prepaid":"cod";
 const firstNdr=r=>r.case?.created_at||r.order?.ndr_at||r.shipment?.ndr_at||null;
 const remark=r=>r.case?.remark||r.case?.reason||r.shipment?.ndr_remark||r.shipment?.ndr_reason||"Delivery attempt failed";
 const state=r=>{
   const s=r.shipment?.status||r.order?.status;
   if(s==="rto"||r.kind==="rto")return "rto";
   if(s==="delivered")return "delivered";
   if(r.case?.status==="resolved")return "delivered";
   if(r.case?.status==="actioned")return "actioned";
   return "action";
 };
 const ageing=r=>{const dt=firstNdr(r);return dt?Math.max(0,Math.floor((Date.now()-new Date(dt).getTime())/86400000)):0};

 const filtered=useMemo(()=>records.filter(r=>{
   const o=r.order||{},s=r.shipment||{},st=state(r),sid=o.store_id||o.listings?.store_id;
   const date=(firstNdr(r)||o.created_at||"").slice(0,10);
   const q=[o.external_order_id,o.id,s.awb,s.courier,s.shipping_partner,o.customer_name,o.customer_phone,getStoreName(r),remark(r)].filter(Boolean).join(" ").toLowerCase();
   const tabOk=tab==="all"||tab==="action"?(tab==="all"||["action","actioned"].includes(st)):tab==="delivered"?st==="delivered":tab==="rto"?st==="rto":true;
   return tabOk&&(!search||q.includes(search.toLowerCase()))&&(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to)&&(filters.payment==="all"||payment(o)===filters.payment)&&(filters.store==="all"||sid===filters.store);
 }),[records,tab,search,filters]);

 const stats=useMemo(()=>({
   total:records.length,
   action:records.filter(r=>["action","actioned"].includes(state(r))).length,
   delivered:records.filter(r=>state(r)==="delivered").length,
   rto:records.filter(r=>state(r)==="rto").length,
   openNdr:records.filter(r=>state(r)==="action").length,
   aged:records.filter(r=>state(r)==="action"&&ageing(r)>=3).length
 }),[records]);

 const reset=()=>{setSearch("");setFilters({from:"",to:"",payment:"all",store:"all"});};

 async function actionRecord(r,next){
   const now=new Date().toISOString(),o=r.order,s=r.shipment,n=r.case;
   if(!o?.id)return;
   if(!s?.id){alert("This NDR/RTO record has no linked shipment.");return}
   const patch={updated_at:now,status:next};
   if(next==="out_for_delivery")patch.last_attempt_at=now;
   if(next==="rto")patch.rto_at=now;
   const {error}=await supabase.from("shipments").update(patch).eq("id",s.id);
   if(error){alert(error.message);return}
   if(n?.id){
     await supabase.from("ndr_cases").update({
       status:next==="rto"?"resolved":"actioned",
       next_action:next==="rto"?"Return to origin":"Reattempt delivery",
       resolved_at:next==="rto"?now:null,
       updated_at:now
     }).eq("id",n.id);
   }
   const orderPatch={updated_at:now,last_event_at:now};
   if(next==="rto"){orderPatch.status="rto";orderPatch.rto_at=now}
   if(next==="out_for_delivery"){orderPatch.status="shipped"}
   await supabase.from("orders").update(orderPatch).eq("id",o.id);
   d.load();
 }

 function exportCsv(){
   const head=["Order date","AWB Number","Pickup date","Shopify order ID","Order ID","Price","Margin","Payment Mode","Customer Name","Address","Number","Product Details","Store Name","Shipping Partner","First NDR Date","NDR Remark","Ageing","Status"];
   const body=filtered.map(r=>{
     const o=r.order||{},s=r.shipment||{},a=o.shipping_address||{},p=o.listings?.products||{};
     return[
       o.created_at||"",s.awb||"",s.pickup_at||"",o.external_order_id||"",o.id,o.amount||0,o.seller_margin||0,payment(o).toUpperCase(),
       o.customer_name||"",[a.address1||a.address||a.street,a.address2,a.city,a.state,a.pincode||a.zip].filter(Boolean).join(", "),
       o.customer_phone||"",[p.title,p.sku,o.quantity?("Qty "+o.quantity):""].filter(Boolean).join(" • "),getStoreName(r),
       s.shipping_partner||s.courier||"",firstNdr(r)||"",remark(r),ageing(r)+" days",state(r)
     ];
   });
   const csv=[head,...body].map(row=>row.map(v=>"\""+String(v).replaceAll("\"","\"\"")+"\"").join(",")).join("\n");
   const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="bucket-india-ndr-rto.csv";a.click();URL.revokeObjectURL(a.href);
 }

 const tabs=[["action","Action Required",stats.action],["delivered","Delivered",stats.delivered],["rto","RTO",stats.rto],["all","All",stats.total]];

 return <AppShell role={role} title="NDR">
  <section className="ndr-hero">
   <div><span className="section-kicker">NDR & RTO CONTROL TOWER</span><h2>Recover every parcel before <em>RTO.</em></h2><p>NDR and RTO status is mirrored from the shipping partner against the seller order, AWB and customer record.</p></div>
   <div className="ndr-hero-mark">NDR<br/><small>LIVE</small></div>
  </section>

  <div className="ndr-kpis">
   {[["total","Total NDR / RTO",stats.total,"Combined exception pool"],["open","Action required",stats.openNdr,"Needs reattempt / decision"],["aged","Aged 3+ days",stats.aged,"Priority follow-up"],["delivered","Delivered",stats.delivered,"Recovered after exception"],["rto","RTO",stats.rto,"Returning to origin"]].map(([k,l,v,h])=><div className={"ndr-kpi "+k} key={k}><span>{l}</span><strong>{v}</strong><small>{h}</small></div>)}
  </div>

  <section className="panel ndr-panel">
   <div className="ndr-filter-panel">
    <div className="ndr-search"><Funnel size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search AWB, Shopify order, Order ID, customer, mobile"/></div>
    <label className="ndr-date"><CalendarBlank size={15}/><span>FROM</span><input type="date" value={filters.from} onChange={e=>setFilters(x=>({...x,from:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label>
    <label className="ndr-date"><span>TO</span><input type="date" value={filters.to} onChange={e=>setFilters(x=>({...x,to:e.target.value}))} onClick={e=>e.currentTarget.showPicker?.()}/></label>
    <div className="ndr-select"><span>PAYMENT</span><select value={filters.payment} onChange={e=>setFilters(x=>({...x,payment:e.target.value}))}><option value="all">All payments</option><option value="cod">COD</option><option value="prepaid">Prepaid</option></select></div>
    <div className="ndr-select"><span>STORE</span><select value={filters.store} onChange={e=>setFilters(x=>({...x,store:e.target.value}))}><option value="all">All stores</option>{stores.map(s=><option key={s.id} value={s.id}>{s.store_name||s.name||s.shop_domain||"Shopify store"}</option>)}</select></div>
    <button className="ndr-reset" onClick={reset}>Reset</button>
   </div>

   <div className="ndr-tabs">{tabs.map(([v,l,c])=><button key={v} className={tab===v?"active "+v:""} onClick={()=>setTab(v)}>{l}<b>{c}</b></button>)}</div>

   <div className="ndr-toolbar"><div><b>{filtered.length}</b> records <span>Showing combined NDR and RTO shipment exceptions</span></div><div><button className="btn compact" onClick={exportCsv}><DownloadSimple size={15}/> Export CSV</button><button className="btn compact" onClick={()=>window.print()}><DownloadSimple size={15}/> Print / Export</button></div></div>

   <div className="ndr-table-shell">
    <table className="ndr-table">
     <thead><tr>
      <th>✓</th><th>Order date</th><th>AWB Number</th><th>Pickup date</th><th>Shopify order ID</th><th>Order ID</th><th>Price</th><th>Margin</th><th>Payment Mode</th><th>Customer details</th><th>Name</th><th>Address</th><th>Number</th><th>Product Details</th><th>Store Name</th><th>Shipping Partner</th><th>First NDR Date</th><th>NDR Remark</th><th>Ageing</th><th>Status</th><th>Action</th>
     </tr></thead>
     <tbody>
      {filtered.map((r,i)=>{
       const o=r.order||{},s=r.shipment||{},st=state(r),a=o.shipping_address||{},p=o.listings?.products||{};
       return <tr key={(r.case?.id||s.id||o.id)+i}>
        <td><input type="checkbox"/></td>
        <td><b>{o.created_at?new Date(o.created_at).toLocaleDateString("en-IN"):"—"}</b><small>{o.created_at?new Date(o.created_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):""}</small></td>
        <td><b className="ndr-awb">{s.awb||"Pending"}</b></td>
        <td>{s.pickup_at?new Date(s.pickup_at).toLocaleDateString("en-IN"):"—"}</td>
        <td><b>#{o.external_order_id||"—"}</b></td>
        <td><b>{o.id?.slice(0,10)}…</b></td>
        <td><strong>{money(o.amount)}</strong></td>
        <td><strong className="ndr-margin">{money(o.seller_margin)}</strong></td>
        <td><span className={"payment-chip "+payment(o)}>{payment(o).toUpperCase()}</span></td>
        <td><span className="customer-badge">{o.customer_name||"Customer"}</span></td>
        <td>{o.customer_name||"—"}</td>
        <td><span className="ndr-address">{[a.address1||a.address,a.address2,a.city,a.state,a.pincode||a.zip].filter(Boolean).join(", ")||"Address available"}</span></td>
        <td>{o.customer_phone||"—"}</td>
        <td><span className="ndr-product">{[p.title,p.sku,o.quantity?("Qty "+o.quantity):""].filter(Boolean).join(" • ")||"Product unavailable"}</span></td>
        <td><span className="store-chip">{getStoreName(r)}</span></td>
        <td>{s.shipping_partner||s.courier||"—"}</td>
        <td>{firstNdr(r)?new Date(firstNdr(r)).toLocaleDateString("en-IN"):"—"}</td>
        <td><span className="ndr-remark">{remark(r)}</span></td>
        <td><span className={ageing(r)>=3?"ageing-risk":"ageing"}>{ageing(r)}d</span></td>
        <td><span className={statusClass(st)}>{st==="action"?"Action required":st==="actioned"?"Actioned":st==="delivered"?"Delivered":"RTO"}</span></td>
        <td><div className="ndr-actions">{["action","actioned"].includes(st)&&<><button className="btn primary compact" onClick={()=>actionRecord(r,"out_for_delivery")}>Reattempt</button><button className="btn danger compact" onClick={()=>actionRecord(r,"rto")}>RTO</button></>}{st==="delivered"&&<span className="ndr-done">Recovered</span>}{st==="rto"&&<span className="ndr-done">Returning</span>}</div></td>
       </tr>
      })}
     </tbody>
    </table>
   </div>
   {!filtered.length&&<div className="table-empty-state"><Empty title={d.loading?"Loading NDR & RTO…":"No matching NDR / RTO parcels"} text="Shipping-partner NDR and RTO events will appear here against the linked order and AWB."/></div>}
  </section>
 </AppShell>
}

export function RtoCenter({role="seller"}){const d=useOrders(role);const rows=d.rows.filter(o=>o.status==="rto");return <AppShell role={role} title="RTO Intelligence"><section className="ops-hero risk"><div><span className="section-kicker">RETURN TO ORIGIN</span><h2>Turn RTO into <span>actionable data.</span></h2><p>See every returning parcel, its value, margin impact and courier trail in one place.</p></div><div className="ops-orbit">RTO</div></section><div className="stats ops-stats"><Stat label="RTO parcels" value={rows.length}/><Stat label="RTO GMV" value={money(rows.reduce((a,o)=>a+Number(o.amount||0),0))}/><Stat label="Margin at risk" value={money(rows.reduce((a,o)=>a+Number(o.seller_margin||0),0))}/></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Margin impact</th><th>Courier</th><th>AWB</th><th>RTO date</th></tr></thead><tbody>{rows.map(o=><tr key={o.id}><td>#{o.external_order_id||o.id.slice(0,8)}</td><td>{o.customer_name||"—"}</td><td>{money(o.amount)}</td><td className="danger-text">{money(o.seller_margin)}</td><td>{o.shipments?.[0]?.courier||"—"}</td><td>{o.shipments?.[0]?.awb||o.awb||"—"}</td><td>{o.rto_at?new Date(o.rto_at).toLocaleDateString("en-IN"):"—"}</td></tr>)}</tbody></table></div>{!rows.length&&<Empty title="No RTO parcels" text="RTO orders will automatically appear here after vendor updates the shipment."/>}</section></AppShell>}

export function RemittanceCenter({role="seller"}){const {session}=useAuth();const [rows,setRows]=useState([]);async function load(){if(!session?.user?.id)return;let q=supabase.from("remittances").select("*, orders(external_order_id,amount,payment_method,seller_margin,customer_name)").order("created_at",{ascending:false});if(role==="seller")q=q.eq("seller_id",session.user.id);else{const {data:v}=await supabase.from("vendors").select("id").eq("owner_id",session.user.id).maybeSingle();q=v?q.eq("vendor_id",v.id):q.eq("vendor_id","00000000-0000-0000-0000-000000000000")}const {data,error}=await q;if(!error)setRows(data||[])}useEffect(()=>{load()},[session?.user?.id,role]);const total=rows.reduce((a,r)=>a+Number(r.amount||0),0);return <AppShell role={role} title="Margin Remittance"><section className="ops-hero finance"><div><span className="section-kicker">COD SETTLEMENT</span><h2>Vendor collects COD. <span>Seller margin is remitted.</span></h2><p>For delivered COD orders, the platform records the seller margin as a remittance obligation. Payment status stays visible to both parties.</p></div><div className="ops-orbit">₹</div></section><div className="stats ops-stats"><Stat label="Remittances" value={rows.length}/><Stat label="Total margin" value={money(total)}/><Stat label="Pending" value={money(rows.filter(r=>r.status==="pending").reduce((a,r)=>a+Number(r.amount||0),0))}/><Stat label="Paid" value={money(rows.filter(r=>r.status==="paid").reduce((a,r)=>a+Number(r.amount||0),0))}/></div><section className="panel"><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>COD amount</th><th>Seller margin</th><th>Status</th><th>Created</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>#{r.orders?.external_order_id||r.order_id.slice(0,8)}</td><td>{r.orders?.customer_name||"—"}</td><td>{money(r.orders?.amount)}</td><td><b className="success-text">{money(r.amount)}</b></td><td><span className={statusClass(r.status)}>{r.status}</span></td><td>{new Date(r.created_at).toLocaleDateString("en-IN")}</td></tr>)}</tbody></table></div>{!rows.length&&<Empty title="No remittances yet" text="Delivered COD orders create the margin-remittance record automatically."/>}</section></AppShell>}

function AnalyticsSelect({icon:Icon,label,value,options,onChange}){const [open,setOpen]=useState(false);useEffect(()=>{const close=e=>{if(!e.target.closest(".analytics-select"))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);const selected=options.find(o=>o.value===value)||options[0];return <div className="analytics-filter-control"><span className="analytics-filter-label"><Icon size={14}/>{label}</span><div className={"analytics-select"+(open?" is-open":"")}><button type="button" className="analytics-select-trigger" onClick={()=>setOpen(v=>!v)}><span>{selected?.label}</span><CaretDown size={14}/></button>{open&&<div className="analytics-select-menu">{options.map(o=><button type="button" key={o.value} className={value===o.value?"selected":""} onClick={()=>{onChange(o.value);setOpen(false)}}><span>{o.label}</span>{value===o.value&&<Check size={14}/>}</button>)}</div>}</div></div>}

export function SellerAnalytics(){
 const {session}=useAuth();
 const [rows,setRows]=useState([]),[stores,setStores]=useState([]),[products,setProducts]=useState([]),[listings,setListings]=useState([]);
 const [filters,setFilters]=useState({from:"",to:"",status:"all",payment:"all",store:"all"});
 const [loading,setLoading]=useState(true);
 async function load(){
  if(!session?.user?.id)return;
  setLoading(true);
  const [{data:o},{data:st},{data:l},{data:p}]=await Promise.all([
   supabase.from("orders").select("*,listings(product_id,store_id),shipments(*),ndr_cases(*)").eq("seller_id",session.user.id).order("created_at",{ascending:false}),
   supabase.from("stores").select("id,name,shop_domain").eq("seller_id",session.user.id),
   supabase.from("listings").select("id,product_id,store_id,cost_price,selling_price").eq("seller_id",session.user.id),
   supabase.from("products").select("id,title,sku")
  ]);
  setRows(o||[]);setStores(st||[]);setListings(l||[]);setProducts(p||[]);setLoading(false);
 }
 useEffect(()=>{load();if(!session?.user?.id)return;const ch=supabase.channel("seller-analytics-"+session.user.id).on("postgres_changes",{event:"*",schema:"public",table:"orders"},load).subscribe();return()=>supabase.removeChannel(ch)},[session?.user?.id]);
 const storeMap=useMemo(()=>Object.fromEntries(stores.map(s=>[s.id,s])),[stores]), productMap=useMemo(()=>Object.fromEntries(products.map(p=>[p.id,p])),[products]), listingMap=useMemo(()=>Object.fromEntries(listings.map(l=>[l.id,l])),[listings]);
 const filtered=useMemo(()=>rows.filter(o=>{
  const d=new Date(o.created_at);const day=d.toISOString().slice(0,10);const payment=String(o.payment_method||o.payment_mode||"unknown").toLowerCase();const lid=o.listing_id||o.listings?.id;const sid=o.store_id||o.listings?.store_id||listingMap[lid]?.store_id;
  return (!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)&&(filters.status==="all"||o.status===filters.status)&&(filters.payment==="all"||payment===filters.payment)&&(filters.store==="all"||sid===filters.store);
 }),[rows,filters,listingMap]);
 const delivered=filtered.filter(o=>o.status==="delivered").length,rto=filtered.filter(o=>o.status==="rto").length,ndr=filtered.filter(o=>o.status==="ndr"||(o.ndr_cases||[]).some(n=>n.status==="open")).length,confirmed=filtered.filter(o=>["confirmed","packed","shipped","delivered","ndr","rto"].includes(o.status)).length;
 const gmv=filtered.reduce((a,o)=>a+Number(o.amount||0),0),margin=filtered.reduce((a,o)=>a+Number(o.seller_margin||0),0);
 const rates={margin:gmv?margin/gmv*100:0,delivery:filtered.length?delivered/filtered.length*100:0,rto:filtered.length?rto/filtered.length*100:0,ndr:filtered.length?ndr/filtered.length*100:0};
 const dateSeries=useMemo(()=>{const m={};filtered.forEach(o=>{const k=new Date(o.created_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short"});m[k]=(m[k]||0)+1});return Object.entries(m).slice(-12)},[filtered]);
 const paymentSeries=useMemo(()=>{const m={};filtered.forEach(o=>{const k=String(o.payment_method||o.payment_mode||"Unknown").toUpperCase();m[k]=(m[k]||0)+1});return Object.entries(m)},[filtered]);
 const productRows=useMemo(()=>{const m={};filtered.forEach(o=>{const lid=o.listing_id||o.listings?.id;const l=listingMap[lid];const pid=o.product_id||o.listings?.product_id||l?.product_id;const p=productMap[pid];const k=pid||o.product_name||"unknown";if(!m[k])m[k]={name:p?.title||o.product_name||"Unmapped product",sku:p?.sku||"—",sales:0,orders:0,gmv:0,margin:0,del:0,rto:0};m[k].sales+=Number(o.quantity||1);m[k].orders++;m[k].gmv+=Number(o.amount||0);m[k].margin+=Number(o.seller_margin||0);if(o.status==="delivered")m[k].del++;if(o.status==="rto")m[k].rto++});return Object.values(m).sort((a,b)=>b.gmv-a.gmv).slice(0,5)},[filtered,listingMap,productMap]);
 const stateSeries=useMemo(()=>{const m={};filtered.forEach(o=>{const a=o.shipping_address||o.customer_address||o.address||{};const s=(typeof a==="string"?a.match(/(?:state|State)[:\s-]*([^,]+)/)?.[1]:a.state)||o.state||o.customer_state||"Unknown";m[String(s).trim()]=(m[String(s).trim()]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,7)},[filtered]);
 const confirmation=[["Pending",filtered.filter(o=>o.status==="pending").length],["Confirmed",confirmed],["Cancelled",filtered.filter(o=>o.status==="cancelled").length]];
 const delivery=[["Delivered",delivered],["NDR",ndr],["RTO",rto]];
 const set=(k,v)=>setFilters(x=>({...x,[k]:v}));
 const reset=()=>setFilters({from:"",to:"",status:"all",payment:"all",store:"all"});
 return <AppShell role="seller" title="Analytics">
  <section className="analytics-hero-v3">
   <div className="analytics-hero-glow glow-one"/><div className="analytics-hero-glow glow-two"/><div className="analytics-orbit"><i/><i/><i/><span><ChartLineUp size={17}/></span></div>
   <div className="analytics-hero-copy"><div className="analytics-live"><i/>LIVE ANALYTICS <span>•</span> UPDATED IN REAL TIME</div><h2>Your business, <em>in motion.</em></h2><p>Turn order flow into decisions with a live view of revenue, delivery, margins and customer outcomes.</p><div className="analytics-hero-chips"><span><ShoppingCart size={13}/>{filtered.length} orders</span><span><TrendUp size={13}/>{rates.delivery.toFixed(0)}% delivered</span><span><Coins size={13}/>{money(gmv)}</span></div></div>
   <div className="analytics-command-card"><div className="command-icon"><Lightning size={18} weight="fill"/></div><div><small>WORKSPACE</small><b>Seller Intelligence</b><span>Everything is filtered live</span></div><div className="command-pulse"><i/><i/><i/></div></div>
  </section>
  <section className="analytics-filters-v4"><div className="filters-heading"><div className="filters-icon"><Funnel size={17}/></div><div><b>Filter analytics</b><span>Refine the workspace below</span></div></div>
   <div className="analytics-date-control"><span className="analytics-filter-label"><CalendarBlank size={14}/>DATE RANGE</span><div className="date-range-fields"><input aria-label="From date" type="date" value={filters.from} onChange={e=>set("from",e.target.value)} onClick={e=>e.currentTarget.showPicker?.()}/><b>→</b><input aria-label="To date" type="date" value={filters.to} onChange={e=>set("to",e.target.value)} onClick={e=>e.currentTarget.showPicker?.()}/></div></div>
   <AnalyticsSelect icon={CheckCircle} label="ORDER STATUS" value={filters.status} onChange={v=>set("status",v)} options={[{value:"all",label:"All orders"},...sellerTabs.slice(1).map(x=>({value:x,label:x[0].toUpperCase()+x.slice(1)}))]}/>
   <AnalyticsSelect icon={Coins} label="PAYMENT MODE" value={filters.payment} onChange={v=>set("payment",v)} options={[{value:"all",label:"All payments"},...[...new Set(rows.map(o=>String(o.payment_method||o.payment_mode||"unknown").toLowerCase()))].map(x=>({value:x,label:x.toUpperCase()}))]}/>
   <AnalyticsSelect icon={Storefront} label="SHOPIFY STORE" value={filters.store} onChange={v=>set("store",v)} options={[{value:"all",label:"All stores"},...stores.map(s=>({value:s.id,label:s.name||s.shop_domain||"Shopify store"}))]}/>
   <button className="analytics-reset-v4" onClick={reset}><Funnel size={14}/><span>Reset filters</span></button>
  </section>
  <div className="stats analytics-kpis">
   <Stat label="Sync orders" value={filtered.length} hint="Matched to filters"/><Stat label="Confirmed orders" value={confirmed} hint={filtered.length?Math.round(confirmed/filtered.length*100)+"% of orders":"—"}/><Stat label="Margin %" value={rates.margin.toFixed(1)+"%"} hint={money(margin)+" contribution"}/><Stat label="Delivery %" value={rates.delivery.toFixed(1)+"%"} hint={delivered+" delivered"}/><Stat label="RTO %" value={rates.rto.toFixed(1)+"%"} hint={rto+" orders"}/><Stat label="NDR %" value={rates.ndr.toFixed(1)+"%"} hint={ndr+" active cases"}/>
  </div>
  <div className="analytics-main-grid">
   <section className="panel analytics-chart-card wide"><div className="panel-head"><div><span className="section-kicker">ORDER ANALYTICS</span><h2>Order volume over time</h2><p>Daily order flow in the selected range.</p></div><TrendUp size={20}/></div><LineChart data={dateSeries}/></section>
   <section className="panel analytics-chart-card"><div className="panel-head"><div><span className="section-kicker">DELIVERY PERFORMANCE</span><h2>Fulfillment health</h2></div><Truck size={20}/></div><DonutChart data={delivery}/><div className="chart-legend">{delivery.map(([k,v])=><span key={k}><i className={"dot "+k.toLowerCase()}/><b>{v}</b>{k}</span>)}</div></section>
  </div>
  <section className="panel analytics-product-card"><div className="panel-head"><div><span className="section-kicker">TOP 5 PRODUCT ANALYSIS</span><h2>Products driving your business</h2><p>Ranked by GMV for the selected filters.</p></div><Package size={22}/></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Product</th><th>Sales</th><th>Order share</th><th>GMV</th><th>Margin</th><th>Delivery</th><th>RTO</th></tr></thead><tbody>{productRows.length?productRows.map(p=><tr key={p.sku+p.name}><td><div className="product-cell"><span>{p.name.slice(0,1)}</span><div><b>{p.name}</b><small>{p.sku}</small></div></div></td><td><b>{p.sales}</b></td><td>{filtered.length?Math.round(p.orders/filtered.length*100)+"%":"—"}</td><td><b>{money(p.gmv)}</b></td><td><b>{money(p.margin)}</b><small>{p.gmv?Math.round(p.margin/p.gmv*100)+"%": "0%"}</small></td><td><span className="rate-good">{p.orders?Math.round(p.del/p.orders*100):0}%</span></td><td><span className="rate-risk">{p.orders?Math.round(p.rto/p.orders*100):0}%</span></td></tr>):<tr><td colSpan="7"><Empty title={loading?"Loading analytics…":"No product data for these filters"} text="Sync orders or change the filter range."/></td></tr>}</tbody></table></div></section>
  <div className="analytics-lower-grid"><section className="panel analytics-chart-card"><div className="panel-head"><div><span className="section-kicker">PAYMENT MIX</span><h2>Orders by payment mode</h2></div><CreditCard size={21}/></div><DonutChart data={paymentSeries}/><div className="chart-legend">{paymentSeries.map(([k,v])=><span key={k}><i className="dot"/><b>{v}</b>{k}</span>)}</div></section><section className="panel analytics-chart-card"><div className="panel-head"><div><span className="section-kicker">CONFIRMATION</span><h2>Order confirmation</h2></div><CheckCircle size={21}/></div><MiniBars data={confirmation}/></section><section className="panel analytics-chart-card"><div className="panel-head"><div><span className="section-kicker">DELIVERY VS RTO</span><h2>Outcome comparison</h2></div><WarningCircle size={21}/></div><MiniBars data={delivery}/></section><section className="panel analytics-chart-card"><div className="panel-head"><div><span className="section-kicker">GEOGRAPHY</span><h2>Delivery by state</h2></div><MapPin size={21}/></div><MiniBars data={stateSeries}/></section></div>
 </AppShell>
}
function LineChart({data}){const max=Math.max(1,...data.map(x=>x[1]));return <div className="analytics-line-chart">{data.length?<><div className="line-grid">{[1,.75,.5,.25,0].map((x,i)=><i key={i} style={{bottom:(x*100)+"%"}}/>)}</div><div className="line-bars">{data.map(([label,v],i)=><div key={label+i} className="line-point"><span style={{height:Math.max(8,v/max*100)+"%"}}><b>{v}</b></span><small>{label}</small></div>)}</div></>:<Empty title="No order activity" text="Choose a wider date range."/ >}</div>}
function DonutChart({data}){const total=data.reduce((a,x)=>a+Number(x[1]||0),0);let offset=0;const r=48,c=2*Math.PI*r;return <div className="donut-wrap"><svg viewBox="0 0 120 120">{data.map(([k,v],i)=>{const dash=total?Number(v)/total*c:0;const el=<circle key={k+i} className={"donut-segment seg-"+(i%5)} cx="60" cy="60" r={r} fill="none" strokeWidth="14" strokeDasharray={dash+" "+(c-dash)} strokeDashoffset={-offset} transform="rotate(-90 60 60)"/>;offset+=dash;return el})}</svg><div><b>{total}</b><span>orders</span></div></div>}
function MiniBars({data}){const max=Math.max(1,...data.map(x=>Number(x[1]||0)));return <div className="mini-bars">{data.map(([k,v])=><div key={k}><div><span>{k}</span><b>{v}</b></div><i><em style={{width:(v/max*100)+"%"}}/></i></div>)}</div>}
function sellerOrderStats(rows){return {pending:rows.filter(o=>o.status==="pending").length,processing:rows.filter(o=>["confirmed","packed","shipped"].includes(o.status)).length,confirmed:rows.filter(o=>o.status==="confirmed").length,inTransit:rows.filter(o=>["packed","shipped","ndr"].includes(o.status)).length,delivered:rows.filter(o=>o.status==="delivered").length,ndr:rows.filter(o=>o.status==="ndr"||(o.ndr_cases||[]).some(n=>n.status==="open")).length,rto:rows.filter(o=>o.status==="rto").length,margin:rows.filter(o=>o.payment_method==="cod").reduce((a,o)=>a+Number(o.seller_margin||0),0)}; }
