import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const storagePath = String(body?.storage_path || "").trim();
    const expiresIn = Math.min(600, Math.max(300, Number(body?.expires_in || 600)));
    if (!storagePath) throw new Error("storage_path is required");

    const { data: record, error: recordError } = await userClient
      .from("Bucket img")
      .select("id,user_id,storage_path,document_type")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (recordError || !record) throw new Error("KYC document not found");
    if (record.user_id !== user.id) {
      const { data: isAdmin } = await userClient.rpc("is_admin");
      if (!isAdmin) throw new Error("Forbidden");
    }

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data, error } = await adminClient.storage.from("img").createSignedUrl(storagePath, expiresIn);
    if (error || !data?.signedUrl) throw new Error(error?.message || "Unable to create signed URL");

    return new Response(JSON.stringify({
      signed_url: data.signedUrl,
      expires_in: expiresIn,
      document_type: record.document_type,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Request failed" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
