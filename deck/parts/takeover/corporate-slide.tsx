import { useId } from "react"

/*
 * The fake-out. Every colour and face in here is off-theme on purpose: this is
 * the slide template nobody chose, so it takes nothing from the Afterglow
 * tokens. It is one SVG so the takeover can serialise exactly what is on
 * screen into a texture and tear it apart pixel for pixel.
 *
 * The fonts are system faces only. An SVG drawn as an image cannot fetch web
 * fonts, so a system stack is what keeps the copy on screen and the copy in
 * the texture identical.
 */

const corporateFont =
  "Calibri, Carlito, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

const agenda = [
  "Introduction",
  "Background",
  "Governance Framework",
  "Key Takeaways",
  "Q&A",
]

export const corporateSlideTitle =
  "Schema City: A Structured Approach to Content Model Governance"

export function CorporateSlide() {
  // Ids are scoped per instance so the two slides that draw this never share
  // a gradient, and stripped to characters a url(#...) reference accepts.
  const id = `corp${useId().replace(/[^a-zA-Z0-9]/g, "")}`

  return (
    <svg
      aria-label={corporateSlideTitle}
      data-corporate-slide=""
      height="1080"
      role="img"
      style={{ display: "block", height: "100%", width: "100%" }}
      viewBox="0 0 1920 1080"
      width="1920"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0a2a6b" />
          <stop offset="0.55" stopColor="#1557b0" />
          <stop offset="1" stopColor="#2b8be0" />
        </linearGradient>
        <linearGradient id={`${id}-office`} x1="0" x2="0.4" y1="0" y2="1">
          <stop offset="0" stopColor="#dfe6ee" />
          <stop offset="1" stopColor="#8299b3" />
        </linearGradient>
        <filter height="140%" id={`${id}-bokeh`} width="140%" x="-20%" y="-20%">
          <feGaussianBlur stdDeviation="22" />
        </filter>
        <filter height="140%" id={`${id}-shadow`} width="140%" x="-20%" y="-20%">
          <feDropShadow
            dx="0"
            dy="18"
            floodColor="#04163d"
            floodOpacity="0.45"
            stdDeviation="22"
          />
        </filter>
        <clipPath id={`${id}-photo`}>
          <rect height="560" rx="28" width="680" />
        </clipPath>
        <pattern
          height="190"
          id={`${id}-watermark`}
          patternTransform="rotate(-28)"
          patternUnits="userSpaceOnUse"
          width="380"
        >
          <text
            fill="#ffffff"
            fillOpacity="0.32"
            fontFamily={corporateFont}
            fontSize="54"
            fontWeight="700"
            letterSpacing="6"
            x="10"
            y="80"
          >
            PREVIEW
          </text>
        </pattern>
      </defs>

      <rect fill={`url(#${id}-sky)`} height="1080" width="1920" />

      {/* The swooshes every template ships with. */}
      <path
        d="M0 860 C 420 760, 900 980, 1920 760 L 1920 1000 L 0 1000 Z"
        fill="#ffffff"
        fillOpacity="0.08"
      />
      <path
        d="M0 920 C 560 820, 1100 1010, 1920 860 L 1920 1000 L 0 1000 Z"
        fill="#ffffff"
        fillOpacity="0.1"
      />

      {/* An unfilled logo placeholder, the clearest sign nobody owns this file. */}
      <g transform="translate(120 96)">
        <rect
          fill="none"
          height="88"
          rx="6"
          stroke="#ffffff"
          strokeDasharray="10 8"
          strokeOpacity="0.7"
          strokeWidth="3"
          width="300"
        />
        <text
          fill="#ffffff"
          fillOpacity="0.8"
          fontFamily={corporateFont}
          fontSize="26"
          letterSpacing="3"
          textAnchor="middle"
          x="150"
          y="54"
        >
          YOUR LOGO HERE
        </text>
      </g>

      <g fill="#ffffff" fontFamily={corporateFont}>
        <text fontSize="96" fontWeight="700" x="116" y="398">
          Schema City:
        </text>
        <text fontSize="64" x="120" y="490">
          A Structured Approach to
        </text>
        <text fontSize="64" x="120" y="570">
          Content Model Governance
        </text>
      </g>
      <rect fill="#7cc4ff" height="6" width="160" x="120" y="626" />
      <text
        fill="#ffffff"
        fontFamily={corporateFont}
        fontSize="40"
        fontWeight="700"
        x="120"
        y="708"
      >
        Daniel Schmidt
      </text>
      <text
        fill="#cfe6ff"
        fontFamily={corporateFont}
        fontSize="32"
        x="120"
        y="758"
      >
        Umbraco DK Meetup | 22 October 2026
      </text>

      {/* A stock photo of a handshake, still carrying its preview watermark. */}
      <g filter={`url(#${id}-shadow)`} transform="translate(1110 190)">
        <g clipPath={`url(#${id}-photo)`}>
          <rect fill={`url(#${id}-office)`} height="560" width="680" />
          <g fill="#ffffff" filter={`url(#${id}-bokeh)`}>
            <circle cx="90" cy="80" fillOpacity="0.7" r="70" />
            <circle cx="300" cy="40" fillOpacity="0.5" r="54" />
            <circle cx="560" cy="110" fillOpacity="0.65" r="90" />
            <circle cx="640" cy="420" fillOpacity="0.35" r="80" />
            <rect fillOpacity="0.55" height="200" width="120" x="420" y="0" />
            <rect fillOpacity="0.4" height="160" width="90" x="160" y="10" />
          </g>
          <g transform="translate(-230 -170) scale(1.7)">
            {/* Left sleeve, navy, and its cuff. */}
            <path d="M-20 470 L-20 360 L250 255 L300 345 Z" fill="#1d2a44" />
            <path d="M246 252 L276 238 L322 330 L298 346 Z" fill="#eef3f8" />
            {/* Right sleeve, charcoal, and its cuff. */}
            <path d="M700 300 L700 430 L432 338 L398 252 Z" fill="#3a3f47" />
            <path d="M400 252 L382 262 L414 344 L434 336 Z" fill="#e6ebf1" />
            {/* The hand underneath, palm up. */}
            <path
              d="M404 258 C 362 236, 316 246, 288 268 C 276 292, 300 316, 334 318 C 372 322, 398 334, 416 342 Z"
              fill="#c48a64"
            />
            {/* The hand on top, fingers wrapped over. */}
            <path
              d="M282 262 C 318 230, 372 228, 398 248 C 414 262, 410 288, 388 296 C 362 304, 330 304, 300 324 Z"
              fill="#e7b493"
            />
            <g
              fill="none"
              stroke="#b9805f"
              strokeLinecap="round"
              strokeOpacity="0.8"
              strokeWidth="4"
            >
              <path d="M346 250 C 352 264, 356 280, 354 294" />
              <path d="M364 246 C 372 260, 376 276, 374 292" />
              <path d="M382 252 C 390 264, 392 276, 388 288" />
            </g>
            {/* The thumb of the lower hand, crossing on top. */}
            <path
              d="M330 266 C 346 250, 368 250, 378 262 C 364 270, 346 274, 330 266 Z"
              fill="#c48a64"
            />
          </g>
          <rect fill={`url(#${id}-watermark)`} height="560" width="680" />
        </g>
        <rect
          fill="none"
          height="560"
          rx="28"
          stroke="#ffffff"
          strokeOpacity="0.9"
          strokeWidth="8"
          width="680"
        />
      </g>

      {/* The agenda nobody will reach, in the footer where it always goes. */}
      <rect fill="#ffffff" height="80" width="1920" y="1000" />
      <rect fill="#1557b0" height="80" width="14" y="1000" />
      <text
        fill="#1d2a44"
        fontFamily={corporateFont}
        fontSize="24"
        x="120"
        y="1049"
      >
        <tspan fontWeight="700">AGENDA</tspan>
        {agenda.map((item, index) => (
          <tspan dx="34" key={item}>
            {`${index + 1}. ${item}`}
          </tspan>
        ))}
      </text>
      <text
        fill="#6b7a90"
        fontFamily={corporateFont}
        fontSize="20"
        letterSpacing="2"
        textAnchor="end"
        x="1800"
        y="1048"
      >
        CONFIDENTIAL | INTERNAL USE ONLY
      </text>
      <text
        fill="#1d2a44"
        fontFamily={corporateFont}
        fontSize="24"
        fontWeight="700"
        textAnchor="end"
        x="1856"
        y="1049"
      >
        1
      </text>
    </svg>
  )
}
