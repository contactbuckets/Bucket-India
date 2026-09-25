import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
async function getProfile(userId) {
  if (!userId) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data || null;
}
export function AuthProvider({ children }) {
  const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;
    supabase.auth.getSession().then(async({data})=>{if(!active)return;setSession(data.session);setProfile(await getProfile(data.session?.user?.id));setLoading(false);});
    const {data:subscription}=supabase.auth.onAuthStateChange(async(_event,next)=>{if(!active)return;setSession(next);setProfile(await getProfile(next?.user?.id));setLoading(false);});
    return()=>{active=false;subscription.subscription.unsubscribe();};
  },[]);
  const value=useMemo(()=>({session,profile,loading,refreshProfile:async()=>setProfile(await getProfile(session?.user?.id)),signOut:()=>supabase.auth.signOut()}),[session,profile,loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
