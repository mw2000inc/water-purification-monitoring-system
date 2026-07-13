import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyWebhookHmac, type ShopifyOrder } from "@/lib/shopify"
import type { PaymentMethod, PaymentStatus } from "@/lib/types"

function mapPaymentStatus(financialStatus: string): PaymentStatus {
  if (financialStatus === "paid") return "Paid"
  if (financialStatus === "partially_paid") return "Partial"
  // pending / authorized / refunded / voided / partially_refunded all fall
  // back to Pending — MW2000's PaymentStatus enum has no direct equivalent
  // for a refunded/voided order, this is a known simplification.
  return "Pending"
}

// Shopify orders don't carry a payment method that maps cleanly onto this
// app's fixed enum (Cash/Bank Transfer/Credit Card/GCash/Check) — Shopify
// Payments/checkout card payments are by far the common case, so that's
// the default for every order regardless of the actual gateway used.
const SHOPIFY_PAYMENT_METHOD: PaymentMethod = "Credit Card"

export async function POST(request: Request) {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  const expectedShop = process.env.SHOPIFY_SHOP_DOMAIN
  if (!clientSecret || !expectedShop) {
    // A config problem on our end, not the sender's — 500 so Shopify retries
    // once the env vars are actually set.
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }

  // Read the raw body FIRST — HMAC verification needs the exact bytes Shopify
  // sent, before any JSON parsing.
  const rawBody = await request.text()
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256")
  if (!verifyWebhookHmac(rawBody, hmacHeader, clientSecret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const shopHeader = request.headers.get("x-shopify-shop-domain")
  if (shopHeader && shopHeader !== expectedShop) {
    return NextResponse.json({ error: "Unexpected shop" }, { status: 401 })
  }

  const order = JSON.parse(rawBody) as ShopifyOrder

  // Cancelled orders never shipped — nothing to deduct.
  if (order.cancelled_at) {
    return NextResponse.json({ ok: true, skipped: "cancelled" })
  }

  const admin = createAdminClient()
  const shopifyOrderId = String(order.id)

  // Idempotency: Shopify's webhook delivery is "at least once", so the same
  // order can arrive more than once (retries, redeliveries). Only ever
  // process it the first time.
  const { data: existing } = await admin.from("sales").select("id").eq("shopify_order_id", shopifyOrderId).maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, skipped: "duplicate" })
  }

  const { data: settings } = await admin
    .from("shopify_settings")
    .select("system_customer_id, system_profile_id")
    .eq("id", 1)
    .single()
  if (!settings?.system_customer_id || !settings?.system_profile_id) {
    // Config gap (e.g. OAuth install hasn't finished) — 500 so Shopify keeps
    // retrying within its retry window until the store is fully connected.
    return NextResponse.json({ error: "Shopify integration not fully configured" }, { status: 500 })
  }

  const matched: { productId: string; sku: string; quantity: number; unitPrice: number; subtotal: number }[] = []
  const unmatchedSkus: string[] = []

  for (const item of order.line_items) {
    const sku = item.sku?.trim()
    if (!sku) {
      unmatchedSkus.push(item.title || "(no SKU)")
      continue
    }
    const { data: product } = await admin.from("products").select("id").eq("sku", sku).maybeSingle()
    if (!product) {
      unmatchedSkus.push(sku)
      continue
    }
    const unitPrice = Number(item.price) || 0
    matched.push({
      productId: product.id,
      sku,
      quantity: item.quantity,
      unitPrice,
      subtotal: unitPrice * item.quantity,
    })
  }

  if (unmatchedSkus.length > 0) {
    await admin.from("notifications").insert({
      type: "shopify-sku-not-found",
      message: `Shopify order #${order.order_number} has ${unmatchedSkus.length} item(s) that don't match any product SKU: ${unmatchedSkus.join(", ")}.`,
      related_entity_id: shopifyOrderId,
    })
  }

  if (matched.length === 0) {
    // Nothing to deduct — the unmatched-SKU notification above is the only
    // record of this order.
    return NextResponse.json({ ok: true, skipped: "no matching SKUs" })
  }

  const grossOfMatched = matched.reduce((sum, m) => sum + m.subtotal, 0)
  // Discount is applied at the order level in Shopify but only to the portion
  // of the order this app could actually match to a product — a reasonable
  // simplification when an order is only partially matched.
  const discount = Math.min(Number(order.total_discounts) || 0, grossOfMatched)

  const { data: sale, error: saleError } = await admin
    .from("sales")
    .insert({
      date: order.created_at.slice(0, 10),
      customer_id: settings.system_customer_id,
      sales_rep_id: settings.system_profile_id,
      discount,
      total_amount: grossOfMatched - discount,
      payment_method: SHOPIFY_PAYMENT_METHOD,
      payment_status: mapPaymentStatus(order.financial_status),
      shopify_order_id: shopifyOrderId,
    })
    .select("id")
    .single()
  if (saleError || !sale) {
    return NextResponse.json({ error: saleError?.message ?? "Failed to create sale" }, { status: 500 })
  }

  // Each insert fires the same DB trigger a manual sale uses, which deducts
  // stock and records a "Sale" stock movement — no separate stock-deduction
  // code needed here.
  const { error: itemsError } = await admin.from("sale_items").insert(
    matched.map((m) => ({
      sale_id: sale.id,
      product_id: m.productId,
      quantity: m.quantity,
      unit_price: m.unitPrice,
      subtotal: m.subtotal,
    }))
  )
  if (itemsError) {
    return NextResponse.json({ error: itemsError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saleId: sale.id, matchedItems: matched.length, unmatchedSkus })
}
