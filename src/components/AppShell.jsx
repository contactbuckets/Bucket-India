import { NavLink,useNavigate } from "react-router-dom";
import { useEffect,useState } from "react";
import { useAuth } from "../context/AuthContext";

const sellerGroups=[
 {title:"Command Center",items:[["⌂","Home","/seller"],["◒","Analytics","/seller/analytics"],["▤","Reports","/seller/reports"]]},
 {title:"Sell",items:[["▦","Product Marketplace","/seller/products"],["⊞","My Catalog","/seller/catalog"]]},
 {title:"Orders",items:[["▤","Orders","/seller/orders"],["◇","Shipments","/seller/shipping"],["▱","NDR","/seller/ndr"],["⌁","RTO Intelligence","/seller/rto-intelligence"]]},
 {title:"Money",items:[["₹","Wallet","/seller/wallet"],["◈","Settlements","/seller/billing"]]},
 {title:"Channels & Account",items:[["▣","Shopify Stores","/seller/stores"],["⚙","Settings","/seller/settings"]]}
];
const vendorGroups=[
 {title:"Command Center",items:[["⌂","Overview","/vendor"],["◒","Reports","/vendor/reports"],["◉","Business Health","/vendor/health"]]},
 {title:"Catalog",items:[["▦","Products","/vendor/products"],["↥","Import Products","/vendor/import"],["▤","Inventory","/vendor/inventory"]]},
 {title:"Orders & Fulfillment",items:[["▤","Orders","/vendor/orders"],["◇","Shipping","/vendor/shipping"],["⌁","NDR & RTO","/vendor/exceptions"]]},
 {title:"Business",items:[["♙","Sellers","/vendor/sellers"],["₹","Wallet","/vendor/wallet"],["◇","Pricing","/vendor/pricing"]]},
 {title:"Account",items:[["✓","KYC","/vendor/kyc"],["▣","Integrations","/vendor/integrations"],["⚙","Settings","/vendor"]]}
];
export default function AppShell({role,title,children}){
 const {profile,signOut}=useAuth(),navigate=useNavigate();
 const [dark,setDark]=useState(()=>localStorage.getItem("bucket-theme")==="dark");
 const groups=role==="vendor"?vendorGroups:sellerGroups;
 useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";localStorage.setItem("bucket-theme",dark?"dark":"light")},[dark]);
 async function logout(){await signOut();navigate("/login",{replace:true});}
 return <div className="app-shell">
  <aside className="sidebar">
   <div className="logo"><span className="logo-mark">B</span><div><strong>Bucket India</strong><small>{role==="vendor"?"Vendor Console":"B2B Marketplace"}</small></div></div>
   <div className="sidebar-scroll">{groups.map(group=><div className="nav-group" key={group.title}><span className="nav-group-title">{group.title}</span><nav>{group.items.map(([icon,label,href],i)=><NavLink key={label} to={href} end={i===0&&href==="/"+role}><span className="nav-icon">{icon}</span><span>{label}</span>{["Orders","Products","Winning Ads"].includes(label)&&<em className="nav-badge">{label==="Orders"?"NEW":""}</em>}</NavLink>)}</nav></div>)}</div>
   <div className="sidebar-footer"><div className="avatar">{(profile?.full_name||profile?.role||"U").slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{profile?.full_name||"Account"}</b><span>{profile?.role||role}</span></div><button className="theme-toggle" onClick={()=>setDark(v=>!v)} aria-label="Toggle theme">{dark?"☀":"☾"}</button><button className="icon-btn" onClick={logout} aria-label="Sign out">↪</button></div>
  </aside>
  <main className="main"><header className="topbar"><div className="topbar-title"><div className="eyebrow">{role==="vendor"?"Vendor workspace":"Seller workspace"}</div><h1>{title}</h1></div><div className="topbar-actions"><div className="command-search">⌕ <span>Search products, orders, tools...</span><kbd>⌘ K</kbd></div><button className="notification-btn" title="Notifications">♢<span>3</span></button><span className="online-pill"><i/> Online</span></div></header><div className="page">{children}</div></main>
 </div>;
}
export function Stat({label,value,hint}){return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>}
export function Empty({title,text}){return <div className="empty"><div className="empty-icon">◫</div><h3>{title}</h3><p>{text}</p></div>}
