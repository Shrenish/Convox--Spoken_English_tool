export function SpeakingIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="speakGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5b8cff" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="speakGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3dd68c" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Background glow circle */}
      <circle cx="100" cy="100" r="75" fill="url(#speakGrad1)" fillOpacity="0.12" />
      <circle cx="100" cy="100" r="60" stroke="#5b8cff" strokeWidth="1.5" strokeDasharray="4 4" strokeOpacity="0.4" />
      
      {/* Sound waves radiating */}
      <path d="M140 80C148 92 148 108 140 120" stroke="#5b8cff" strokeWidth="3" strokeLinecap="round" />
      <path d="M152 70C164 88 164 112 152 130" stroke="#9db9ff" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M164 60C180 84 180 116 164 140" stroke="#3dd68c" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />

      {/* Microphone body */}
      <rect x="88" y="55" width="24" height="46" rx="12" fill="url(#speakGrad1)" />
      {/* Mic grid highlight */}
      <line x1="93" y1="68" x2="107" y2="68" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="93" y1="76" x2="107" y2="76" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />
      <line x1="93" y1="84" x2="107" y2="84" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />

      {/* Mic cradle */}
      <path d="M80 84C80 97 90 108 100 108C110 108 120 97 120 84" stroke="#9db9ff" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="108" x2="100" y2="128" stroke="#9db9ff" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M84 128H116" stroke="#9db9ff" strokeWidth="4" strokeLinecap="round" />

      {/* Floating conversational sparkle particles */}
      <circle cx="58" cy="65" r="3.5" fill="#ffb454" />
      <circle cx="68" cy="135" r="4.5" fill="#3dd68c" />
      <circle cx="145" cy="45" r="3" fill="#ff6b8b" />
    </svg>
  );
}

export function CoreEvaluationIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="evalGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3dd68c" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="75" fill="#3dd68c" fillOpacity="0.1" />

      {/* Analytics Chart Base Board */}
      <rect x="50" y="45" width="100" height="110" rx="16" fill="var(--bg-surface)" stroke="#3dd68c" strokeWidth="2" />
      
      {/* Bars */}
      <rect x="65" y="110" width="14" height="30" rx="4" fill="#5b8cff" />
      <rect x="85" y="85" width="14" height="55" rx="4" fill="#3dd68c" />
      <rect x="105" y="70" width="14" height="70" rx="4" fill="#ffb454" />
      <rect x="125" y="95" width="14" height="45" rx="4" fill="#ff6b8b" />

      {/* Trend line connecting peaks */}
      <path d="M72 105L92 80L112 65L132 90" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="112" cy="65" r="4.5" fill="#ffffff" stroke="#ffb454" strokeWidth="2" />

      {/* Check badge */}
      <circle cx="140" cy="50" r="16" fill="#3dd68c" />
      <path d="M134 50L138 54L147 45" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TravelJourneyIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="planeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffb454" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      {/* Globe rings */}
      <circle cx="100" cy="100" r="70" fill="#ffb454" fillOpacity="0.08" />
      <circle cx="100" cy="100" r="60" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.3" />
      <ellipse cx="100" cy="100" rx="60" ry="24" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.4" />
      <ellipse cx="100" cy="100" rx="24" ry="60" stroke="#ffb454" strokeWidth="1.5" strokeOpacity="0.4" />

      {/* Flight trajectory arc */}
      <path d="M40 140C65 65 135 60 160 125" stroke="#ffb454" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />

      {/* Airplane */}
      <g transform="translate(100, 68) rotate(25)">
        <path d="M0 -14L7 6L0 2L-7 6Z" fill="#ffb454" />
        <path d="M0 -7L14 3L0 0L-14 3Z" fill="#f59e0b" />
      </g>

      {/* Waypoint Pins */}
      <circle cx="48" cy="130" r="5" fill="#3dd68c" />
      <circle cx="152" cy="120" r="6" fill="#ff6b8b" />
    </svg>
  );
}

export function AdaptiveLearningIllustration({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Target Concentric Circles */}
      <circle cx="100" cy="100" r="72" fill="#ff6b8b" fillOpacity="0.08" />
      <circle cx="100" cy="100" r="54" stroke="#ff6b8b" strokeWidth="1.5" strokeOpacity="0.3" />
      <circle cx="100" cy="100" r="36" stroke="#ff6b8b" strokeWidth="2" strokeOpacity="0.6" />
      <circle cx="100" cy="100" r="16" fill="#ff6b8b" />

      {/* Arrow hitting bullseye */}
      <path d="M45 45L92 92" stroke="#5b8cff" strokeWidth="3" strokeLinecap="round" />
      <path d="M40 40L55 42L42 55Z" fill="#5b8cff" />

      {/* Orbiting skill badges */}
      <circle cx="145" cy="70" r="8" fill="#3dd68c" />
      <circle cx="65" cy="140" r="9" fill="#ffb454" />
      <circle cx="140" cy="145" r="7" fill="#9db9ff" />
    </svg>
  );
}
