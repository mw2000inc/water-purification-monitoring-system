import { useQuery } from "@tanstack/react-query"

export interface ShopifyStatus {
  connected: boolean
  shopDomain: string | null
  scopes: string | null
  installedAt: string | null
}

async function fetchShopifyStatus(): Promise<ShopifyStatus> {
  const res = await fetch("/api/shopify/status")
  if (!res.ok) throw new Error("Failed to load Shopify status")
  return res.json()
}

export function useShopifyStatus() {
  return useQuery({ queryKey: ["shopifyStatus"], queryFn: fetchShopifyStatus })
}
