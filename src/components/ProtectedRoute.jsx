import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute({role,children}){
  const {session,profile,loading}=useAuth();
  if(loading)return <div className="screen-center"><div className="spinner"/></div>;
  if(!session)return <Navigate to="/login" replace/>;
  if(role&&profile?.role!==role)return <Navigate to={profile?.role==="admin"?"/control":profile?.role==="vendor"?"/vendor":"/seller"} replace/>;
  return children;
}
