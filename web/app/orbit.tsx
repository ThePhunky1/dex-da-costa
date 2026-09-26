/** Original geometric artwork; decorative, not a price or activity chart. */
export function Orbit() {
  return <div className="orbitArtwork" aria-hidden="true">
    <svg viewBox="0 0 620 310" fill="none">
      <defs>
        <linearGradient id="rim" x1="140" y1="260" x2="470" y2="60" gradientUnits="userSpaceOnUse"><stop stopColor="#d7f5a8"/><stop offset=".42" stopColor="#77c3ac"/><stop offset="1" stopColor="#173d3c"/></linearGradient>
        <radialGradient id="halo"><stop stopColor="#78c7aa" stopOpacity=".11"/><stop offset="1" stopColor="#78c7aa" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse cx="322" cy="151" rx="260" ry="151" fill="url(#halo)"/>
      <path d="M26 269H594M26 42H594M69 16V290M548 16V290" stroke="#25423d" strokeWidth=".6" strokeDasharray="2 7"/>
      <g transform="translate(312 150) rotate(-21)">
        <ellipse rx="243" ry="97" stroke="#3c675a" strokeWidth=".5"/>
        <ellipse rx="210" ry="79" stroke="url(#rim)" strokeWidth="15"/>
        <ellipse cy="-7" rx="210" ry="79" stroke="#cfe6b7" strokeWidth="1.2"/>
        <ellipse cy="5" rx="209" ry="79" stroke="#071311" strokeWidth="2"/>
        <ellipse rx="192" ry="63" stroke="#315c4d" strokeWidth=".8"/>
        <ellipse rx="155" ry="44" stroke="#82a587" strokeWidth=".7"/>
        <ellipse rx="155" ry="44" stroke="#b9dca0" strokeWidth="5" strokeDasharray="1 27"/>
        <path d="M-190 0H-151M151 0H190M0-72V-45M0 45V72M-132-55L-98-34M132 55L98 34M-132 55L-98 34M132-55L98-34" stroke="#95b09a" strokeWidth="1.2"/>
        <ellipse rx="211" ry="80" stroke="#e0f4ba" strokeWidth="4" strokeDasharray="1 12" opacity=".6"/>
      </g>
      <circle cx="509" cy="82" r="4" fill="#c9f09d"/><path d="M510 80L548 51H588" stroke="#8dad83" strokeWidth=".8"/>
      <path d="M41 215H96L117 199" stroke="#54745f" strokeWidth=".8"/>
      <text x="35" y="204" fill="#88a391" fontSize="9" fontFamily="monospace" letterSpacing="2">OPEN ACCESS</text>
      <text x="508" y="38" fill="#88a391" fontSize="9" fontFamily="monospace" letterSpacing="2">ELYSIUM</text>
      <path d="M307 145H317M312 140V150" stroke="#d7efb3"/><circle cx="312" cy="145" r="22" stroke="#46715d" strokeDasharray="2 5"/>
      <text x="275" y="285" fill="#61796a" fontSize="8" fontFamily="monospace" letterSpacing="3">DA COSTA / 001</text>
    </svg>
  </div>;
}
