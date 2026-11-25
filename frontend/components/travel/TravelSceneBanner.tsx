"use client";

interface Props {
  scenarioKey?: string;
  title?: string;
}

export function TravelSceneBanner({ scenarioKey = "", title = "" }: Props) {
  const key = `${scenarioKey} ${title}`.toLowerCase();

  let scene = {
    badge: "🌍 Travel Scene",
    heading: "Global Survival Adventure",
    sub: "Step into the scene and speak naturally!",
    bg: "from-[#14141b] via-[#191b23] to-[#0c0c10]",
    accent: "#a3e635",
    emojis: ["🧳", "🗺️", "✨"],
    svg: (
      <svg viewBox="0 0 260 90" className="h-20 w-52 shrink-0" aria-hidden="true">
        <rect x="0" y="65" width="260" height="25" rx="6" fill="#1e293b" />
        <circle cx="50" cy="40" r="22" fill="#a3e635" opacity="0.2" />
        <text x="36" y="48" fontSize="28">🧳</text>
        <text x="115" y="46" fontSize="28">✈️</text>
        <text x="195" y="48" fontSize="28">🗺️</text>
      </svg>
    ),
  };

  if (key.includes("airport") || key.includes("flight") || key.includes("terminal") || key.includes("boarding")) {
    scene = {
      badge: "🛫 Airport Terminal · Gate B4",
      heading: "International Departure Terminal",
      sub: "Check-in desk, boarding pass & flight announcements",
      bg: "from-[#0f172a] via-[#14141b] to-[#0c0c10]",
      accent: "#4ade80",
      emojis: ["✈️", "🛂", "🧳"],
      svg: (
        <svg viewBox="0 0 260 90" className="h-20 w-52 shrink-0" aria-hidden="true">
          <rect x="8" y="12" width="244" height="54" rx="10" fill="#1e293b" stroke="#4ade80" strokeWidth="1.5" />
          <rect x="20" y="22" width="75" height="28" rx="4" fill="#0f172a" />
          <text x="26" y="40" fill="#a3e635" fontSize="10" fontFamily="monospace">GATE B4 ✈</text>
          <text x="118" y="47" fontSize="28">🛫</text>
          <text x="175" y="49" fontSize="24">🧳</text>
          <text x="214" y="49" fontSize="24">🛂</text>
          <rect x="0" y="70" width="260" height="16" rx="4" fill="#334155" />
        </svg>
      ),
    };
  } else if (key.includes("hotel") || key.includes("check") || key.includes("room") || key.includes("reception")) {
    scene = {
      badge: "🏨 Hotel Reception · Lobby",
      heading: "Grand Horizon Hotel Check-In",
      sub: "Front desk, room keycard & reservation details",
      bg: "from-[#1e1b2e] via-[#14141b] to-[#0c0c10]",
      accent: "#ec4899",
      emojis: ["🏨", "🛎️", "🔑"],
      svg: (
        <svg viewBox="0 0 260 90" className="h-20 w-52 shrink-0" aria-hidden="true">
          <rect x="20" y="14" width="90" height="58" rx="8" fill="#272734" stroke="#ec4899" strokeWidth="1.5" />
          <rect x="34" y="24" width="16" height="14" rx="2" fill="#fde047" opacity="0.85" />
          <rect x="58" y="24" width="16" height="14" rx="2" fill="#fde047" opacity="0.85" />
          <rect x="82" y="24" width="16" height="14" rx="2" fill="#fde047" opacity="0.85" />
          <rect x="55" y="48" width="22" height="24" rx="3" fill="#ec4899" opacity="0.7" />
          <text x="132" y="52" fontSize="28">🛎️</text>
          <text x="182" y="52" fontSize="26">🔑</text>
          <text x="220" y="52" fontSize="24">🧳</text>
        </svg>
      ),
    };
  } else if (key.includes("restaurant") || key.includes("cafe") || key.includes("food") || key.includes("order") || key.includes("dinner")) {
    scene = {
      badge: "🍽️ Bistro & Restaurant",
      heading: "Cozy Corner Café & Dining",
      sub: "Menu, dietary preferences & ordering with your server",
      bg: "from-[#1c1917] via-[#14141b] to-[#0c0c10]",
      accent: "#facc15",
      emojis: ["🍽️", "🍝", "☕"],
      svg: (
        <svg viewBox="0 0 260 90" className="h-20 w-52 shrink-0" aria-hidden="true">
          <ellipse cx="130" cy="68" rx="95" ry="12" fill="#272734" stroke="#facc15" strokeWidth="1.5" />
          <text x="46" y="52" fontSize="26">🍝</text>
          <text x="115" y="48" fontSize="28">🍽️</text>
          <text x="184" y="52" fontSize="26">☕</text>
          <circle cx="40" cy="22" r="8" fill="#ec4899" opacity="0.35" />
          <circle cx="220" cy="22" r="8" fill="#a3e635" opacity="0.35" />
        </svg>
      ),
    };
  }

  return (
    <div className={`mx-4 mt-3 flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#272734] bg-gradient-to-r ${scene.bg} px-4 py-3 sm:flex-row`}>
      <div className="space-y-1 text-center sm:text-left">
        <span
          className="inline-block rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-black"
          style={{ backgroundColor: scene.accent }}
        >
          {scene.badge}
        </span>
        <h3 className="text-sm font-extrabold text-white">{scene.heading}</h3>
        <p className="text-xs text-slate-400">{scene.sub}</p>
      </div>
      {scene.svg}
    </div>
  );
}
