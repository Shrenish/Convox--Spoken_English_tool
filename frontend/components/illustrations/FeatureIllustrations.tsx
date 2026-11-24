/**
 * CONVOX Feature Illustrations
 * Animated SVG components — each uses inline <style> for CSS keyframe animations.
 * No external dependencies needed. Works in both light and dark themes.
 */

export function SpeakingIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg-mic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b8cff" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="sg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b8cff" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#9db9ff" stopOpacity="0.04" />
        </linearGradient>
        <style>{`
          @keyframes sg-pulse1 { 0%,100%{opacity:0.5;r:62} 50%{opacity:1;r:68} }
          @keyframes sg-pulse2 { 0%,100%{opacity:0.25;r:76} 50%{opacity:0.55;r:84} }
          @keyframes sg-wave1  { 0%,100%{opacity:1} 50%{opacity:0.4} }
          @keyframes sg-wave2  { 0%,100%{opacity:0.7} 50%{opacity:0.2} }
          @keyframes sg-wave3  { 0%,100%{opacity:0.45} 50%{opacity:0.1} }
          @keyframes sg-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes sg-floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(4px)} }
          @keyframes sg-floatC { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
          .sg-p1 { animation: sg-pulse1 2.4s ease-in-out infinite; }
          .sg-p2 { animation: sg-pulse2 3s ease-in-out infinite; }
          .sg-w1 { animation: sg-wave1 1.2s ease-in-out infinite; }
          .sg-w2 { animation: sg-wave2 1.6s ease-in-out 0.2s infinite; }
          .sg-w3 { animation: sg-wave3 2s ease-in-out 0.4s infinite; }
          .sg-fa { animation: sg-float  3s ease-in-out infinite; }
          .sg-fb { animation: sg-floatB 3.5s ease-in-out 0.5s infinite; }
          .sg-fc { animation: sg-floatC 2.8s ease-in-out 1s infinite; }
        `}</style>
      </defs>

      {/* Pulsing background aura */}
      <circle className="sg-p2" cx="100" cy="100" r="76" fill="url(#sg-bg)" />
      <circle className="sg-p1" cx="100" cy="100" r="62" stroke="#5b8cff" strokeWidth="1" strokeOpacity="0.3" fill="none" />

      {/* Sound waves — animate opacity like real audio */}
      <path className="sg-w1" d="M138 78C147 91 147 109 138 122" stroke="#5b8cff" strokeWidth="3.5" strokeLinecap="round" />
      <path className="sg-w2" d="M151 68C164 87 164 113 151 132" stroke="#9db9ff" strokeWidth="2.5" strokeLinecap="round" />
      <path className="sg-w3" d="M164 58C181 83 181 117 164 142" stroke="#3dd68c" strokeWidth="2" strokeLinecap="round" />

      {/* Microphone capsule */}
      <rect x="87" y="52" width="26" height="50" rx="13" fill="url(#sg-mic)" />
      {/* Mic grille lines */}
      <line x1="93" y1="66" x2="107" y2="66" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
      <line x1="93" y1="74" x2="107" y2="74" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
      <line x1="93" y1="82" x2="107" y2="82" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.65" />
      <line x1="93" y1="90" x2="107" y2="90" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />

      {/* Mic stand */}
      <path d="M79 82C79 96 89 109 100 109C111 109 121 96 121 82" stroke="#9db9ff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <line x1="100" y1="109" x2="100" y2="130" stroke="#9db9ff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M83 130H117" stroke="#9db9ff" strokeWidth="4" strokeLinecap="round" />

      {/* Floating accent particles */}
      <circle className="sg-fa" cx="57" cy="63" r="4" fill="#ffb454" fillOpacity="0.9" />
      <circle className="sg-fb" cx="66" cy="137" r="5" fill="#3dd68c" fillOpacity="0.85" />
      <circle className="sg-fc" cx="146" cy="43" r="3.5" fill="#ff6b8b" fillOpacity="0.9" />
    </svg>
  );
}

export function CoreEvaluationIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3dd68c" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.04" />
        </linearGradient>
        <style>{`
          @keyframes cg-bar1 { 0%{transform:scaleY(0);opacity:0} 60%{opacity:1} 100%{transform:scaleY(1)} }
          @keyframes cg-bar2 { 0%{transform:scaleY(0);opacity:0} 70%{opacity:1} 100%{transform:scaleY(1)} }
          @keyframes cg-bar3 { 0%{transform:scaleY(0);opacity:0} 80%{opacity:1} 100%{transform:scaleY(1)} }
          @keyframes cg-bar4 { 0%{transform:scaleY(0);opacity:0} 90%{opacity:1} 100%{transform:scaleY(1)} }
          @keyframes cg-check { 0%{stroke-dashoffset:30} 100%{stroke-dashoffset:0} }
          @keyframes cg-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
          @keyframes cg-shine { 0%,100%{opacity:0.7} 50%{opacity:1} }
          .cg-b1 { transform-origin:72px 140px; animation:cg-bar1 1s ease-out 0.1s both; }
          .cg-b2 { transform-origin:92px 140px; animation:cg-bar2 1s ease-out 0.25s both; }
          .cg-b3 { transform-origin:112px 140px; animation:cg-bar3 1s ease-out 0.4s both; }
          .cg-b4 { transform-origin:132px 140px; animation:cg-bar4 1s ease-out 0.55s both; }
          .cg-ck { stroke-dasharray:30; animation:cg-check 0.6s ease-out 1s both; }
          .cg-badge { animation:cg-pulse 2.5s ease-in-out infinite; transform-origin:140px 50px; }
          .cg-dot { animation:cg-shine 2s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Background radial */}
      <circle cx="100" cy="100" r="78" fill="url(#cg-bg)" />

      {/* Card/board */}
      <rect x="48" y="42" width="104" height="116" rx="14" fill="rgba(30,36,56,0.6)" stroke="#3dd68c" strokeWidth="1.5" />

      {/* Animated bar chart — grow from bottom */}
      <rect className="cg-b1" x="62" y="108" width="16" height="34" rx="4" fill="#5b8cff" />
      <rect className="cg-b2" x="82" y="83" width="16" height="59" rx="4" fill="#3dd68c" />
      <rect className="cg-b3" x="102" y="68" width="16" height="74" rx="4" fill="#ffb454" />
      <rect className="cg-b4" x="122" y="93" width="16" height="49" rx="4" fill="#ff6b8b" />

      {/* Trend line */}
      <path d="M70 103 L90 78 L110 63 L130 88" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="cg-dot" cx="110" cy="63" r="5" fill="#fff" stroke="#ffb454" strokeWidth="2" />

      {/* Check badge */}
      <circle className="cg-badge" cx="140" cy="50" r="17" fill="#3dd68c" />
      <path className="cg-ck" d="M133 50L138 55L148 44" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function TravelJourneyIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tg-bg" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffb454" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
        </linearGradient>
        <style>{`
          @keyframes tg-fly { 0%{transform:translate(0,0)} 25%{transform:translate(12px,-10px)} 50%{transform:translate(22px,-4px)} 75%{transform:translate(32px,-14px)} 100%{transform:translate(0,0)} }
          @keyframes tg-dash { 0%{stroke-dashoffset:120} 100%{stroke-dashoffset:0} }
          @keyframes tg-ping { 0%{transform:scale(1);opacity:1} 100%{transform:scale(2.5);opacity:0} }
          @keyframes tg-spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes tg-floatPin { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
          .tg-plane { animation:tg-fly 4s ease-in-out infinite; }
          .tg-path  { stroke-dasharray:120; animation:tg-dash 2s ease-out 0.3s both; }
          .tg-ping  { animation:tg-ping 1.6s ease-out infinite; transform-origin:152px 118px; }
          .tg-globe { animation:tg-spin 18s linear infinite; transform-origin:100px 100px; }
          .tg-pin   { animation:tg-floatPin 2.2s ease-in-out infinite; transform-origin:48px 128px; }
        `}</style>
      </defs>

      {/* Globe rings */}
      <circle cx="100" cy="100" r="72" fill="url(#tg-bg)" />
      <circle className="tg-globe" cx="100" cy="100" r="62" stroke="#ffb454" strokeWidth="1" strokeOpacity="0.25" fill="none" />
      <ellipse cx="100" cy="100" rx="62" ry="25" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.35" fill="none" />
      <ellipse cx="100" cy="100" rx="25" ry="62" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.35" fill="none" />

      {/* Dashed flight path */}
      <path className="tg-path" d="M43 138C68 62 132 56 158 122" stroke="#ffb454" strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" />

      {/* Animated airplane */}
      <g className="tg-plane" transform="translate(90, 65) rotate(28)">
        <path d="M0 -15L8 7L0 2L-8 7Z" fill="#ffb454" />
        <path d="M0 -7L15 4L0 0L-15 4Z" fill="#f59e0b" fillOpacity="0.85" />
        <path d="M0 7L4 14L0 11L-4 14Z" fill="#ffb454" fillOpacity="0.7" />
      </g>

      {/* Destination pin A — floating */}
      <g className="tg-pin">
        <circle cx="48" cy="128" r="7" fill="#3dd68c" />
        <path d="M48 121 Q54 115 48 108 Q42 115 48 121Z" fill="#3dd68c" fillOpacity="0.7" />
        <circle cx="48" cy="128" r="2.5" fill="#fff" fillOpacity="0.9" />
      </g>

      {/* Destination pin B — ping ripple */}
      <circle className="tg-ping" cx="152" cy="118" r="6" stroke="#ff6b8b" strokeWidth="1.5" fill="none" />
      <circle cx="152" cy="118" r="6" fill="#ff6b8b" />
      <circle cx="152" cy="118" r="2.5" fill="#fff" fillOpacity="0.9" />
    </svg>
  );
}

export function AdaptiveLearningIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ag-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff6b8b" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#9db9ff" stopOpacity="0.04" />
        </linearGradient>
        <style>{`
          @keyframes ag-spin1 { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
          @keyframes ag-spin2 { from{transform:rotate(0deg)} to{transform:rotate(-360deg)} }
          @keyframes ag-arrow { 0%{transform:translate(0,0)} 50%{transform:translate(4px,-4px)} 100%{transform:translate(0,0)} }
          @keyframes ag-orb1  { 0%{transform:rotate(0deg) translateX(50px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(50px) rotate(-360deg)} }
          @keyframes ag-orb2  { 0%{transform:rotate(120deg) translateX(50px) rotate(-120deg)} 100%{transform:rotate(480deg) translateX(50px) rotate(-480deg)} }
          @keyframes ag-orb3  { 0%{transform:rotate(240deg) translateX(50px) rotate(-240deg)} 100%{transform:rotate(600deg) translateX(50px) rotate(-600deg)} }
          @keyframes ag-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
          .ag-ring1 { animation:ag-spin1 20s linear infinite; transform-origin:100px 100px; }
          .ag-ring2 { animation:ag-spin2 14s linear infinite; transform-origin:100px 100px; }
          .ag-arrow { animation:ag-arrow 2s ease-in-out infinite; }
          .ag-orb1  { transform-origin:100px 100px; animation:ag-orb1 6s linear infinite; }
          .ag-orb2  { transform-origin:100px 100px; animation:ag-orb2 6s linear infinite; }
          .ag-orb3  { transform-origin:100px 100px; animation:ag-orb3 6s linear infinite; }
          .ag-bull  { animation:ag-pulse 2s ease-in-out infinite; transform-origin:100px 100px; }
        `}</style>
      </defs>

      {/* Background */}
      <circle cx="100" cy="100" r="76" fill="url(#ag-bg)" />

      {/* Target rings — slow spin */}
      <circle className="ag-ring1" cx="100" cy="100" r="66" stroke="#ff6b8b" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="8 6" fill="none" />
      <circle cx="100" cy="100" r="52" stroke="#ff6b8b" strokeWidth="1.5" strokeOpacity="0.35" fill="none" />
      <circle className="ag-ring2" cx="100" cy="100" r="36" stroke="#ff6b8b" strokeWidth="2" strokeOpacity="0.55" strokeDasharray="5 4" fill="none" />

      {/* Bullseye — pulse */}
      <circle className="ag-bull" cx="100" cy="100" r="17" fill="#ff6b8b" />
      <circle cx="100" cy="100" r="7" fill="#fff" fillOpacity="0.85" />

      {/* Arrow — animated thrust */}
      <g className="ag-arrow">
        <path d="M42 42 L91 91" stroke="#5b8cff" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M37 37L55 40L40 55Z" fill="#5b8cff" />
      </g>

      {/* Three orbiting skill badges */}
      <g className="ag-orb1">
        <circle cx="150" cy="100" r="10" fill="#3dd68c" />
        <text x="150" y="104" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">A</text>
      </g>
      <g className="ag-orb2">
        <circle cx="150" cy="100" r="10" fill="#ffb454" />
        <text x="150" y="104" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">B</text>
      </g>
      <g className="ag-orb3">
        <circle cx="150" cy="100" r="10" fill="#9db9ff" />
        <text x="150" y="104" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="bold">C</text>
      </g>
    </svg>
  );
}
