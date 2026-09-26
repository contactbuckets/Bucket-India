import {Navigate,useLocation} from "react-router-dom";
import {useEffect,useState} from "react";
import {supabase} from "../lib/supabase";
import {useAuth} from "../context/AuthContext";
export default function ProtectedRoute({role,children}){
 const {session,profile,loading}=useAuth(); const location=useLocation(); const [control,setControl]=useState(null),[checking,setChecking]=useState(true);
 useEffect(()=>{let alive=true;(async()=>{if(!session||!profile){if(alive)setChecking(false);return} if(profile.role==="admin"){if(alive)setChecking(false);return} const {data}=await supabase.from("admin_user_controls").select("status,access").eq("user_id",profile.id).maybeSingle();if(alive){setControl(data||null);setChecking(false)}})();return()=>{alive=false}},[session,profile]);
 if(loading||checking)return <div className="screen-center"><div className="spinner"/></div>;
 if(!session)return <Navigate to="/login" replace/>;
 if(role&&profile?.role!==role)return <Navigate to={profile?.role==="admin"?"/control":profile?.role==="vendor"?"/vendor":"/seller"} replace/>;
 if(control?.status==="blocked"||control?.status==="suspended")return <div className="screen-center"><div><h2>Account access restricted</h2><p>Your Bucket India account is currently {control.status}. Contact platform support.</p></div></div>;
 const access=control?.access||{}; const path=location.pathname; const checks=[[path.includes("/orders"),"orders"],[path.includes("/products")||path.includes("/catalog"),"products"],[path.includes("/shipping")||path.includes("/shipments"),"shipments"],[path.includes("/ndr")||path.includes("/exceptions"),"ndr"],[path.includes("/wallet")||path.includes("/billing"),"wallet"],[path.includes("/analytics"),"analytics"],[path.includes("/settings"),"settings"]]; const denied=checks.find(([hit,key])=>hit&&access[key]===false);
 if(denied)return <div className="screen-center"><div><h2>Access restricted</h2><p>Your platform administrator has disabled this module for your account.</p></div></div>;
 return children;
}