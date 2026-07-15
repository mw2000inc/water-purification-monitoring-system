import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { mapShopifyPaymentStatus, verifyWebhookHmac, type ShopifyOrder } from "@/lib/shopify"

// Shopify fires orders/create exactly once, at checkout — it never re-fires
// that event later just because the order changed. A Cash on Delivery order
// is a common case where that matters: it's created with financial_status
// "pending" and only flips to "paid" once the courier collects payment on
// delivery, well after the order already exists in MW2000. This route
// listens for orders/updated (registered alongside orders/create during the
// OAuth callback) and syncs just the payment status onto the matching Sale
// — it never creates a new Sale or touches stock, only updates one already
// created by orders-create.
export async function POST(request: Request) {
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET
  const expectedShop = process.env.SHOPIFY_SHOP_DOMAIN
  if (!clientSecret || !expectedShop) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 })
  }

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
  const admin = createAdminClient()

  const { data: sale } = await admin
    .from("sales")
    .select("id, payment_status")
    .eq("shopify_order_id", String(order.id))
    .maybeSingle()
  if (!sale) {
    // Nothing to sync — this order was never turned into a Sale (e.g. no
    // matching SKUs) or predates the Shopify connection.
    return NextResponse.json({ ok: true, skipped: "no matching sale" })
  }

  const newStatus = mapShopifyPaymentStatus(order.financial_status)
  if (newStatus === sale.payment_status) {
    return NextResponse.json({ ok: true, skipped: "unchanged" })
  }

  const { error } = await admin.from("sales").update({ payment_status: newStatus }).eq("id", sale.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saleId: sale.id, paymentStatus: newStatus })
}
