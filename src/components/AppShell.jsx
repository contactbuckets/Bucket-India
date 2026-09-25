import { NavLink,useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const sellerNav=[["Overview","/seller"],["Products","/seller/products"],["My Catalog","/seller/catalog"],["Stores","/seller/stores"],["Orders","/seller/orders"],["Shipping","/seller/shipping"]];
const vendorNav=[["Overview","/vendor"],["Products","/vendor/products"],["Orders","/vendor/orders"],["Shipping","/vendor/shipping"]];
export default function AppShell({role,title,children}){
 const {profile,signOut}=useAuth(),navigate=useNavigate(),nav=role==="vendor"?vendorNav:sellerNav;
 async function logout(){await signOut();navigate("/login",{replace:true});}
 return <div className="app-shell"><aside className="sidebar"><div className="logo"><span className="logo-mark">B</span><div><strong>Bucket India</strong><small>{role==="vendor"?"Vendor Console":"Seller Console"}</small></div></div><nav>{nav.map(([label,href])=><NavLink key={href} to={href} end={href===`/${role}`}>{label}</NavLink>)}</nav><div className="sidebar-footer"><div className="avatar">{(profile?.full_name||profile?.role||"U").slice(0,1).toUpperCase()}</div><div className="user-meta"><b>{profile?.full_name||"Account"}</b><span>{profile?.role}</span></div><button className="icon-btn" onClick={logout}>↪</button></div></aside><main className="main"><header className="topbar"><div><div className="eyebrow">{role==="vendor"?"Vendor":"Seller"}</div><h1>{title}</h1></div><span className="status-dot">● Online</span></header><div className="page">{children}</div></main></div>;
}
export function Stat({label,value,hint}){return <div className="stat-card"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>}
export function Empty({title,text}){return <div className="empty"><div className="empty-icon">◫</div><h3>{title}</h3><p>{text}</p></div>}
