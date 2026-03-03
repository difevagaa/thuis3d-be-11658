import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MascotSettings {
  enabled: boolean;
  mascot_type: string;
  primary_color: string;
  secondary_color: string;
  position: string;
  animation_frequency: string;
  click_reactions: boolean;
  show_on_mobile: boolean;
}

const MASCOT_DESIGNS: Record<string, (primary: string, secondary: string) => JSX.Element> = {
  robot: (p, s) => (
    <svg viewBox="0 0 100 120" width="70" height="84" className="mascot-body">
      {/* Antenna */}
      <line x1="50" y1="5" x2="50" y2="20" stroke={s} strokeWidth="3" className="mascot-antenna"/>
      <circle cx="50" cy="5" r="4" fill={p} className="mascot-antenna-tip"/>
      {/* Head */}
      <rect x="20" y="20" width="60" height="45" rx="12" fill={p} className="mascot-head"/>
      {/* Eyes */}
      <circle cx="38" cy="42" r="7" fill="white" className="mascot-eye-bg"/>
      <circle cx="62" cy="42" r="7" fill="white" className="mascot-eye-bg"/>
      <circle cx="38" cy="42" r="4" fill={s} className="mascot-pupil mascot-pupil-left"/>
      <circle cx="62" cy="42" r="4" fill={s} className="mascot-pupil mascot-pupil-right"/>
      {/* Mouth */}
      <path d="M 38 55 Q 50 62 62 55" stroke={s} strokeWidth="2.5" fill="none" className="mascot-mouth"/>
      {/* Body */}
      <rect x="25" y="68" width="50" height="35" rx="8" fill={s} className="mascot-torso"/>
      {/* Arms */}
      <rect x="8" y="72" width="15" height="8" rx="4" fill={p} className="mascot-arm-left"/>
      <rect x="77" y="72" width="15" height="8" rx="4" fill={p} className="mascot-arm-right"/>
      {/* Feet */}
      <rect x="28" y="103" width="16" height="10" rx="5" fill={p}/>
      <rect x="56" y="103" width="16" height="10" rx="5" fill={p}/>
    </svg>
  ),
  cat: (p, s) => (
    <svg viewBox="0 0 100 110" width="70" height="77" className="mascot-body">
      {/* Ears */}
      <polygon points="20,30 30,5 40,30" fill={p} className="mascot-ear-left"/>
      <polygon points="60,30 70,5 80,30" fill={p} className="mascot-ear-right"/>
      <polygon points="24,28 30,12 36,28" fill="#FFB6C1"/>
      <polygon points="64,28 70,12 76,28" fill="#FFB6C1"/>
      {/* Head */}
      <ellipse cx="50" cy="45" rx="32" ry="28" fill={p} className="mascot-head"/>
      {/* Eyes */}
      <ellipse cx="38" cy="42" rx="6" ry="7" fill="white"/>
      <ellipse cx="62" cy="42" rx="6" ry="7" fill="white"/>
      <ellipse cx="38" cy="43" rx="4" ry="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
      <ellipse cx="62" cy="43" rx="4" ry="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
      {/* Nose */}
      <ellipse cx="50" cy="52" rx="3" ry="2" fill="#FFB6C1"/>
      {/* Whiskers */}
      <line x1="15" y1="50" x2="35" y2="52" stroke={s} strokeWidth="1.5"/>
      <line x1="15" y1="55" x2="35" y2="55" stroke={s} strokeWidth="1.5"/>
      <line x1="65" y1="52" x2="85" y2="50" stroke={s} strokeWidth="1.5"/>
      <line x1="65" y1="55" x2="85" y2="55" stroke={s} strokeWidth="1.5"/>
      {/* Mouth */}
      <path d="M 45 55 Q 50 60 55 55" stroke={s} strokeWidth="1.5" fill="none" className="mascot-mouth"/>
      {/* Body */}
      <ellipse cx="50" cy="82" rx="22" ry="18" fill={p} className="mascot-torso"/>
      {/* Tail */}
      <path d="M 72 85 Q 90 75 85 60" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tail"/>
      {/* Paws */}
      <ellipse cx="35" cy="98" rx="8" ry="5" fill={p}/>
      <ellipse cx="65" cy="98" rx="8" ry="5" fill={p}/>
    </svg>
  ),
  octopus: (p, s) => (
    <svg viewBox="0 0 100 110" width="70" height="77" className="mascot-body">
      {/* Head */}
      <ellipse cx="50" cy="35" rx="30" ry="30" fill={p} className="mascot-head"/>
      {/* Eyes */}
      <circle cx="40" cy="32" r="8" fill="white"/>
      <circle cx="60" cy="32" r="8" fill="white"/>
      <circle cx="40" cy="33" r="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
      <circle cx="60" cy="33" r="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
      {/* Mouth */}
      <path d="M 42 46 Q 50 52 58 46" stroke={s} strokeWidth="2" fill="none" className="mascot-mouth"/>
      {/* Tentacles */}
      <path d="M 22 55 Q 10 75 18 95" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t1"/>
      <path d="M 30 60 Q 20 80 25 100" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t2"/>
      <path d="M 42 63 Q 38 85 40 105" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t3"/>
      <path d="M 58 63 Q 62 85 60 105" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t4"/>
      <path d="M 70 60 Q 80 80 75 100" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t5"/>
      <path d="M 78 55 Q 90 75 82 95" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t6"/>
    </svg>
  ),
  ghost: (p, s) => (
    <svg viewBox="0 0 100 120" width="70" height="84" className="mascot-body">
      {/* Body + wavy bottom */}
      <path d="M 20 50 Q 20 15, 50 15 Q 80 15, 80 50 L 80 95 Q 73 85, 65 95 Q 57 105, 50 95 Q 43 85, 35 95 Q 27 105, 20 95 Z" fill={p} className="mascot-head"/>
      {/* Eyes */}
      <circle cx="38" cy="48" r="8" fill="white"/>
      <circle cx="62" cy="48" r="8" fill="white"/>
      <circle cx="38" cy="49" r="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
      <circle cx="62" cy="49" r="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
      {/* Mouth */}
      <ellipse cx="50" cy="65" rx="6" ry="4" fill={s} className="mascot-mouth"/>
      {/* Blush */}
      <circle cx="28" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
      <circle cx="72" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
    </svg>
  ),
};

export default function SiteMascot() {
  const [settings, setSettings] = useState<MascotSettings | null>(null);
  const [visible, setVisible] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const reactionTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    supabase
      .from("site_mascot_settings")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as unknown as MascotSettings);
      });
  }, []);

  const getFrequencyMs = (freq: string) => {
    switch (freq) {
      case "slow": return 25000;
      case "fast": return 8000;
      default: return 15000;
    }
  };

  const moveToRandomPosition = useCallback(() => {
    const positions = [
      { bottom: "20px", right: "20px", left: "auto", top: "auto" },
      { bottom: "20px", left: "20px", right: "auto", top: "auto" },
      { top: "40%", right: "10px", bottom: "auto", left: "auto" },
      { top: "40%", left: "10px", bottom: "auto", right: "auto" },
      { bottom: "100px", right: "50px", left: "auto", top: "auto" },
    ];
    const pos = positions[Math.floor(Math.random() * positions.length)];
    setPositionStyle(pos);
  }, []);

  useEffect(() => {
    if (!settings?.enabled) return;
    if (!settings.show_on_mobile && window.innerWidth < 768) return;

    // Initial appearance after 3s
    const initialTimer = setTimeout(() => {
      setVisible(true);
      moveToRandomPosition();
    }, 3000);

    // Periodic hide/show cycle
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        moveToRandomPosition();
        setVisible(true);
      }, 2000);
    }, getFrequencyMs(settings.animation_frequency));

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [settings, moveToRandomPosition]);

  const handleClick = useCallback(() => {
    if (!settings?.click_reactions) return;
    const reactions = ["wave", "jump", "spin", "wiggle", "surprise"];
    const r = reactions[Math.floor(Math.random() * reactions.length)];
    setReaction(r);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReaction(null), 1200);
  }, [settings]);

  if (!settings?.enabled || !visible) return null;

  const MascotSVG = MASCOT_DESIGNS[settings.mascot_type] || MASCOT_DESIGNS.robot;

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 cursor-pointer select-none transition-all duration-700 ease-in-out mascot-container ${reaction ? `mascot-react-${reaction}` : "mascot-idle"}`}
      style={{ ...positionStyle, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.2))" }}
      onClick={handleClick}
      title="¡Hola! 👋"
    >
      <style>{`
        .mascot-idle .mascot-body { animation: mascot-float 4s ease-in-out infinite; }
        .mascot-idle .mascot-pupil-left { animation: mascot-look 6s ease-in-out infinite; }
        .mascot-idle .mascot-pupil-right { animation: mascot-look 6s ease-in-out infinite; }
        .mascot-idle .mascot-antenna-tip { animation: mascot-glow 2s ease-in-out infinite; }
        .mascot-idle .mascot-tail { animation: mascot-wag 3s ease-in-out infinite; }
        .mascot-idle .mascot-tentacle { animation: mascot-wave-tentacle 4s ease-in-out infinite; }
        .mascot-idle .mascot-tentacle.t2 { animation-delay: 0.3s; }
        .mascot-idle .mascot-tentacle.t3 { animation-delay: 0.6s; }
        .mascot-idle .mascot-tentacle.t4 { animation-delay: 0.9s; }
        .mascot-idle .mascot-tentacle.t5 { animation-delay: 1.2s; }
        .mascot-idle .mascot-tentacle.t6 { animation-delay: 1.5s; }
        .mascot-container { transition: opacity 0.5s, transform 0.5s; }
        .mascot-react-wave { animation: mascot-wave-anim 1.2s ease-in-out; }
        .mascot-react-jump { animation: mascot-jump-anim 0.8s ease-out; }
        .mascot-react-spin { animation: mascot-spin-anim 1s ease-in-out; }
        .mascot-react-wiggle { animation: mascot-wiggle-anim 0.8s ease-in-out; }
        .mascot-react-surprise { animation: mascot-surprise-anim 1s ease-in-out; }
        @keyframes mascot-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes mascot-look { 0%,100%{transform:translateX(0)} 30%{transform:translateX(2px)} 70%{transform:translateX(-2px)} }
        @keyframes mascot-glow { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes mascot-wag { 0%,100%{transform:rotate(0)} 25%{transform:rotate(8deg)} 75%{transform:rotate(-8deg)} }
        @keyframes mascot-wave-tentacle { 0%,100%{transform:rotate(0)} 50%{transform:rotate(5deg)} }
        @keyframes mascot-wave-anim { 0%{transform:rotate(0)} 15%{transform:rotate(-15deg)} 30%{transform:rotate(15deg)} 45%{transform:rotate(-10deg)} 60%{transform:rotate(10deg)} 100%{transform:rotate(0)} }
        @keyframes mascot-jump-anim { 0%{transform:translateY(0)} 30%{transform:translateY(-30px) scale(1.1)} 50%{transform:translateY(-30px) scale(1.1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-spin-anim { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes mascot-wiggle-anim { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes mascot-surprise-anim { 0%{transform:scale(1)} 20%{transform:scale(1.3)} 40%{transform:scale(0.9)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
      `}</style>
      {MascotSVG(settings.primary_color, settings.secondary_color)}
    </div>
  );
}
