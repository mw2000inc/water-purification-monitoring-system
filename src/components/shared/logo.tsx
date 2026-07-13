export function Logo({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- simple fixed logo asset, not worth Next/Image's layout config for every tiny usage size across the app
  return <img src="/logo.png" alt="MW2000" className={className} />
}
