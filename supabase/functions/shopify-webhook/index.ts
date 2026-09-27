import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type,x-shopify-hmac-sha256,x-shopify-shop-domain,x-shopify-topic,x-shopify-event-id",
};

const enc = new TextEncoder();

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bytesToBase64(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

async function hmacBase64(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return bytesToBase64(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(body))));
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json({ ok: true });

  let eventId = req.headers.get("x-shopify-event-id") || crypto.randomUUID();
  const shop = (req.headers.get("x-shopify-shop-domain") || "").toLowerCase().trim();
  const topic = (req.headers.get("x-shopify-topic") || "").toLowerCase().trim();
  const hmac = req.headers.get("x-shopify-hmac-sha256") || "";
  const body = await req.text();

  try {
    if (!shop || !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return json({ ok: false, error: "Invalid Shopify shop." }, 400);
    if (!topic || !hmac) return json({ ok: false, error: "Missing Shopify webhook headers." }, 400);

    const secret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
    if (!secret) throw new Error("SHOPIFY_CLIENT_SECRET is not configured.");

    const expected = await hmacBase64(secret, body);
    if (!safeEqual(expected, hmac)) return json({ ok: false, error: "Invalid webhook signature." }, 401);

    const payload = JSON.parse(body || "{}");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: inserted, error: insertError } = await admin
      .from("shopify_webhook_events")
      .insert({ shop_domain: shop, event_id: eventId, topic, payload, status: "received" })
      .select("id")
      .maybeSingle();

    if (insertError?.code === "23505") return json({ ok: true, duplicate: true });
    if (insertError) throw insertError;

    const mark = async (status: string, error_message: string | null = null) => {
      await admin.from("shopify_webhook_events").update({
        status,
        error_message,
        processed_at: new Date().toISOString(),
      }).eq("id", inserted?.id);
    };

    const { data: store, error: storeError } = await admin
      .from("stores")
      .select("id,seller_id,shop_domain")
      .eq("platform", "shopify")
      .eq("shop_domain", shop)
      .maybeSingle();
    if (storeError) throw storeError;

    if (!store) {
      await mark("ignored", "No connected Bucket India store is registered for this Shopify domain.");
      return json({ ok: true, ignored: true });
    }

    const productId = payload.id != null ? String(payload.id) : null;

    if (topic === "products/delete" && productId) {
      const { error } = await admin.from("listings").update({
        status: "shopify_deleted",
        shopify_sync_status: "deleted",
        shopify_sync_error: "Product was deleted in Shopify.",
        shopify_deleted_at: new Date().toISOString(),
        shopify_last_seen_at: new Date().toISOString(),
      }).eq("store_id", store.id).eq("shopify_product_id", productId);
      if (error) throw error;
    }

    if ((topic === "products/create" || topic === "products/update") && productId) {
      const { error } = await admin.from("listings").update({
        status: "pushed",
        shopify_sync_status: "synced",
        shopify_sync_error: null,
        shopify_deleted_at: null,
        shopify_last_seen_at: new Date().toISOString(),
      }).eq("store_id", store.id).eq("shopify_product_id", productId);
      if (error) throw error;
    }

    if (topic === "inventory_levels/update") {
      // Inventory is intentionally treated as Shopify-owned stock. Bucket India's vendor
      // product stock remains the supplier/source-of-truth and is not overwritten here.
      // The event is retained for audit/reconciliation.
    }

    if (topic.startsWith("orders/") || topic === "fulfillments/update") {
      const orderId = payload.id != null ? String(payload.id) : null;
      if (orderId) {
        const { data: existing, error: existingError } = await admin
          .from("orders")
          .select("id,status")
          .eq("seller_id", store.seller_id)
          .eq("external_order_id", orderId)
          .maybeSingle();
        if (existingError) throw existingError;

        if (topic === "orders/cancelled") {
          if (existing) {
            const { error } = await admin.from("orders").update({
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
              last_event_at: new Date().toISOString(),
            }).eq("id", existing.id);
            if (error) throw error;
          }
        } else {
          const line = Array.isArray(payload.line_items) ? payload.line_items[0] : null;
          const variantId = line?.variant_id != null ? String(line.variant_id) : null;

          let listing: any = null;
          if (variantId) {
            const { data, error } = await admin.from("listings")
              .select("id,seller_id,selling_price,product_id")
              .eq("store_id", store.id)
              .eq("shopify_variant_id", variantId)
              .maybeSingle();
            if (error) throw error;
            listing = data;
          }

          const quantity = Number(line?.quantity || 1);
          const amount = Number(payload.total_price || line?.price || 0);
          const payment = Array.isArray(payload.payment_gateway_names)
            && payload.payment_gateway_names.some((x: unknown) => /cash|cod/i.test(String(x))) ? "cod" : "prepaid";

          let status = "pending";
          if (topic === "orders/fulfilled" || payload.fulfillment_status === "fulfilled" || topic === "fulfillments/update") status = "shipped";
          else if (topic === "orders/edited") status = existing?.status || "pending";

          const data = {
            seller_id: store.seller_id,
            listing_id: listing?.id ?? null,
            external_order_id: orderId,
            customer_name: payload.customer?.first_name
              ? [payload.customer.first_name, payload.customer.last_name].filter(Boolean).join(" ")
              : null,
            customer_phone: payload.phone || payload.customer?.phone || payload.shipping_address?.phone || null,
            shipping_address: payload.shipping_address || {},
            quantity,
            amount,
            status,
            payment_method: payment,
            vendor_amount: listing ? Number(listing.selling_price || 0) * quantity : 0,
            seller_margin: listing ? Math.max(0, amount - Number(listing.selling_price || 0) * quantity) : 0,
            last_event_at: new Date().toISOString(),
            cancelled_at: topic === "orders/cancelled" ? new Date().toISOString() : null,
          };

          if (existing) {
            const { error } = await admin.from("orders").update(data).eq("id", existing.id);
            if (error) throw error;
          } else {
            const { error } = await admin.from("orders").insert(data);
            if (error) throw error;
          }
        }
      }
    }

    await mark("processed");
    return json({ ok: true, processed: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    try {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("shopify_webhook_events")
        .update({ status: "error", error_message: message, processed_at: new Date().toISOString() })
        .eq("event_id", eventId);
    } catch {}
    return json({ ok: false, error: message }, 500);
  }
});