import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

async function getProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Profile load failed:", error);
    return null;
  }
  return data || null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadInitialSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error) console.error("Session load failed:", error);

      const nextSession = data?.session || null;
      setSession(nextSession);
      setProfile(await getProfile(nextSession?.user?.id));
      if (active) setLoading(false);
    };

    loadInitialSession();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;

      // Keep this callback synchronous. Supabase Auth can deadlock if another
      // Supabase request is awaited from inside onAuthStateChange.
      setSession(nextSession);

      setTimeout(async () => {
        if (!active) return;
        const nextProfile = await getProfile(nextSession?.user?.id);
        if (!active) return;
        setProfile(nextProfile);
        setLoading(false);
      }, 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      refreshProfile: async () => setProfile(await getProfile(session?.user?.id)),
      signOut: () => supabase.auth.signOut(),
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
