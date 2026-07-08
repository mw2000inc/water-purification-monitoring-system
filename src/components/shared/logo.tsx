export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#1e3a72" stroke="#e0201d" strokeWidth="6" />
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="900"
        fontSize="36"
        letterSpacing="-2"
        fill="#ffffff"
      >
        MW
      </text>
    </svg>
  )
}
