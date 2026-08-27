import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PRODUCTION_ORIGIN = "https://cigas337.github.io";
const MAX_ACTIVE_SUBSCRIPTIONS = 25;
const ALLOWED_ORIGINS = new Set([
  PRODUCTION_ORIGIN,
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function isAllowedOrigin(origin: string | null) {
  return !origin || ALLOWED_ORIGINS.has(origin);
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin) ? origin : PRODUCTION_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(data: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanList(value: unknown) {
  if (!Array.isArray(value)) return ["*"];
  const items = [...new Set(value.map(item => String(item).trim()).filter(Boolean))]
    .filter(item => item.length <= 120)
    .slice(0, 50);
  return items.length ? items : ["*"];
}

function namedKeys(envName: string) {
  try {
    const parsed = JSON.parse(Deno.env.get(envName) || "{}");
    return Object.values(parsed).map(value => String(value || "")).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function serviceRoleKey() {
  return namedKeys("SUPABASE_SECRET_KEYS")[0] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
}

function hasValidPublishableKey(req: Request) {
  const supplied = String(req.headers.get("apikey") || "");
  if (!supplied) return false;
  if (namedKeys("SUPABASE_PUBLISHABLE_KEYS").includes(supplied)) return true;
  return supplied === String(Deno.env.get("SUPABASE_ANON_KEY") || "");
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (!isAllowedOrigin(origin)) return json({ ok: false, error: "Origin not allowed" }, 403, origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "GET" && req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405, origin);
  if (!hasValidPublishableKey(req)) return json({ ok: false, error: "Unauthorized" }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL") || "";
  const service = serviceRoleKey();
  if (!url || !service) return json({ ok: false, error: "Push service unavailable" }, 503, origin);
  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: config, error: configError } = await db
    .from("push_config")
    .select("vapid_public_key")
    .eq("singleton", true)
    .maybeSingle();
  if (configError || !config?.vapid_public_key) {
    return json({ ok: false, error: "Push configuration unavailable" }, 503, origin);
  }

  if (req.method === "GET") {
    return json({
      ok: true,
      version: "14.0.1",
      vapidPublicKey: config.vapid_public_key,
      minIntervalMinutes: 5,
      iosHomeScreenRequired: true,
    }, 200, origin);
  }

  const declaredLength = Number(req.headers.get("Content-Length") || 0);
  if (declaredLength > 16_384) return json({ ok: false, error: "Request too large" }, 413, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json({ ok: false, error: "Invalid JSON" }, 400, origin);
  }

  const action = String(body.action || "subscribe");
  const rawSubscription = body.subscription && typeof body.subscription === "object"
    ? body.subscription as Record<string, unknown>
    : {};
  const endpoint = String(rawSubscription.endpoint || "").trim();
  if (!endpoint.startsWith("https://") || endpoint.length > 4096) {
    return json({ ok: false, error: "Invalid push endpoint" }, 400, origin);
  }

  if (action === "unsubscribe") {
    const { error } = await db
      .from("push_subscriptions")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("endpoint", endpoint);
    return error
      ? json({ ok: false, error: "Could not disable subscription" }, 500, origin)
      : json({ ok: true, active: false }, 200, origin);
  }
  if (action !== "subscribe") return json({ ok: false, error: "Invalid action" }, 400, origin);

  const keys = rawSubscription.keys && typeof rawSubscription.keys === "object"
    ? rawSubscription.keys as Record<string, unknown>
    : {};
  const p256dh = String(keys.p256dh || "").trim();
  const auth = String(keys.auth || "").trim();
  const isBase64Url = (value: string) => /^[A-Za-z0-9_-]+$/.test(value);
  if (p256dh.length < 80 || p256dh.length > 140 || !isBase64Url(p256dh) ||
      auth.length < 16 || auth.length > 64 || !isBase64Url(auth)) {
    return json({ ok: false, error: "Invalid subscription keys" }, 400, origin);
  }

  const { data: existing, error: existingError } = await db
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (existingError) return json({ ok: false, error: "Could not validate subscription" }, 500, origin);

  if (!existing) {
    const { count, error: countError } = await db
      .from("push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("active", true);
    if (countError) return json({ ok: false, error: "Could not validate subscription limit" }, 500, origin);
    if ((count || 0) >= MAX_ACTIVE_SUBSCRIPTIONS) {
      return json({ ok: false, error: "Subscription limit reached" }, 429, origin);
    }
  }

  const row = {
    endpoint,
    p256dh,
    auth,
    active: true,
    user_agent: String(req.headers.get("User-Agent") || "").slice(0, 500),
    platform: String(body.platform || "").slice(0, 100),
    locale: String(body.locale || "").slice(0, 40),
    collections: cleanList(body.collections),
    stores: cleanList(body.stores),
    updated_at: new Date().toISOString(),
    last_error: null,
  };
  const { error } = await db.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  return error
    ? json({ ok: false, error: "Could not save subscription" }, 500, origin)
    : json({ ok: true, active: true, vapidPublicKey: config.vapid_public_key }, 200, origin);
});
