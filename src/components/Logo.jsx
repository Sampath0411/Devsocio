// DevSocio Logo — DS geometric hexagon monogram + wordmark
// Usage:
//   <DevSocioLogo />                   — full logo (icon + text)
//   <DevSocioLogo iconOnly />          — hexagon icon only
//   <DevSocioLogo size="sm|md|lg|xl" />
//   <DevSocioLogo dark />              — on light backgrounds

export default function DevSocioLogo({ iconOnly = false, size = 'md', dark = false, className = '' }) {
  const sizes = {
    sm: { icon: 28, text: 16, gap: 6 },
    md: { icon: 36, text: 20, gap: 8 },
    lg: { icon: 46, text: 26, gap: 10 },
    xl: { icon: 64, text: 36, gap: 14 },
  }
  const s = sizes[size] || sizes.md
  const textColor = dark ? '#14213D' : '#FFFFFF'

  return (
    <div
      className={`flex items-center ${className}`}
      style={{ gap: s.gap }}
      role="img"
      aria-label="DevSocio"
    >
      {/* Hexagon Icon */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Hexagon background */}
        <path
          d="M20 2L36.5 11.5V28.5L20 38L3.5 28.5V11.5L20 2Z"
          fill="#FCA311"
        />
        {/* Inner dark hexagon (depth) */}
        <path
          d="M20 6L33 13.5V26.5L20 34L7 26.5V13.5L20 6Z"
          fill="#14213D"
        />
        {/* DS monogram */}
        {/* D letter */}
        <path
          d="M10.5 14H15C16.8 14 18.3 15.5 18.3 17.5V22.5C18.3 24.5 16.8 26 15 26H10.5V14Z"
          fill="#FCA311"
        />
        <path
          d="M12.5 16V24H14.5C15.6 24 16.3 23.2 16.3 22V18C16.3 16.8 15.6 16 14.5 16H12.5Z"
          fill="#14213D"
        />
        {/* S letter */}
        <path
          d="M20.5 14H27.5V16.5H22.5V19H26.5V21.5H22.5V23.5H27.5V26H20.5V14Z"
          fill="#FCA311"
        />
      </svg>

      {/* Wordmark */}
      {!iconOnly && (
        <span
          style={{
            fontSize: s.text,
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: textColor,
          }}
        >
          Dev<span style={{ color: '#FCA311' }}>Socio</span>
        </span>
      )}
    </div>
  )
}
