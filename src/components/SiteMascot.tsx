import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
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
  size: string;
  walk_speed: string;
  sound_enabled: boolean;
  welcome_message: string;
  opacity: number;
  night_mode: boolean;
  follow_cursor: boolean;
  show_emojis: boolean;
  hide_on_checkout: boolean;
  spontaneous_interval: number;
}

const SIZE_MAP: Record<string, number> = { small: 50, medium: 70, large: 95 };
const SPEED_MAP: Record<string, number> = { slow: 0.3, normal: 0.7, fast: 1.4 };

const REACTIONS = ["wave", "jump", "spin", "wiggle", "surprise", "dance", "nod", "heart"] as const;
type Reaction = typeof REACTIONS[number];

const EMOJIS = ["❤️", "⭐", "🎉", "✨", "💫", "🌟", "😊", "🎈"];

const CHECKOUT_PATHS = ["/payment", "/checkout", "/card-payment", "/revolut-payment", "/payment-processing", "/payment-summary", "/shipping-info"];

function isNightTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

function getMascotSVG(type: string, p: string, s: string, size: number, sleeping: boolean) {
  const designs: Record<string, JSX.Element> = {
    robot: (
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
        <line x1="50" y1="5" x2="50" y2="20" stroke={s} strokeWidth="3" className="mascot-antenna"/>
        <circle cx="50" cy="5" r="4" fill={p} className="mascot-antenna-tip"/>
        <rect x="20" y="20" width="60" height="45" rx="12" fill={p}/>
        <circle cx="38" cy="42" r="7" fill="white"/>
        <circle cx="62" cy="42" r="7" fill="white"/>
        {sleeping ? (
          <>
            <line x1="32" y1="42" x2="44" y2="42" stroke={s} strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="56" y1="42" x2="68" y2="42" stroke={s} strokeWidth="2.5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <circle cx="38" cy="42" r="4" fill={s} className="mascot-pupil mascot-pupil-left"/>
            <circle cx="62" cy="42" r="4" fill={s} className="mascot-pupil mascot-pupil-right"/>
          </>
        )}
        <path d={sleeping ? "M 40 56 Q 50 58 60 56" : "M 38 55 Q 50 62 62 55"} stroke={s} strokeWidth="2.5" fill="none"/>
        <rect x="25" y="68" width="50" height="35" rx="8" fill={s}/>
        <rect x="8" y="72" width="15" height="8" rx="4" fill={p} className="mascot-arm-left"/>
        <rect x="77" y="72" width="15" height="8" rx="4" fill={p} className="mascot-arm-right"/>
        <ellipse cx="36" cy="108" rx="9" ry="6" fill={p} className="mascot-foot-left"/>
        <ellipse cx="64" cy="108" rx="9" ry="6" fill={p} className="mascot-foot-right"/>
      </svg>
    ),
    cat: (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
        <polygon points="20,30 30,5 40,30" fill={p}/>
        <polygon points="60,30 70,5 80,30" fill={p}/>
        <polygon points="24,28 30,12 36,28" fill="#FFB6C1"/>
        <polygon points="64,28 70,12 76,28" fill="#FFB6C1"/>
        <ellipse cx="50" cy="45" rx="32" ry="28" fill={p}/>
        <ellipse cx="38" cy="42" rx="6" ry="7" fill="white"/>
        <ellipse cx="62" cy="42" rx="6" ry="7" fill="white"/>
        {sleeping ? (
          <>
            <path d="M 32 43 Q 38 40 44 43" stroke={s} strokeWidth="2" fill="none"/>
            <path d="M 56 43 Q 62 40 68 43" stroke={s} strokeWidth="2" fill="none"/>
          </>
        ) : (
          <>
            <ellipse cx="38" cy="43" rx="4" ry="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
            <ellipse cx="62" cy="43" rx="4" ry="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
          </>
        )}
        <ellipse cx="50" cy="52" rx="3" ry="2" fill="#FFB6C1"/>
        <line x1="15" y1="50" x2="35" y2="52" stroke={s} strokeWidth="1.5"/>
        <line x1="15" y1="55" x2="35" y2="55" stroke={s} strokeWidth="1.5"/>
        <line x1="65" y1="52" x2="85" y2="50" stroke={s} strokeWidth="1.5"/>
        <line x1="65" y1="55" x2="85" y2="55" stroke={s} strokeWidth="1.5"/>
        <path d={sleeping ? "M 45 56 L 55 56" : "M 45 55 Q 50 60 55 55"} stroke={s} strokeWidth="1.5" fill="none"/>
        <ellipse cx="50" cy="82" rx="22" ry="18" fill={p}/>
        <path d="M 72 85 Q 90 75 85 60" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tail"/>
        <ellipse cx="35" cy="98" rx="8" ry="5" fill={p} className="mascot-foot-left"/>
        <ellipse cx="65" cy="98" rx="8" ry="5" fill={p} className="mascot-foot-right"/>
      </svg>
    ),
    octopus: (
      <svg viewBox="0 0 100 110" width={size} height={size * 1.1}>
        <ellipse cx="50" cy="35" rx="30" ry="30" fill={p}/>
        <circle cx="40" cy="32" r="8" fill="white"/>
        <circle cx="60" cy="32" r="8" fill="white"/>
        {sleeping ? (
          <>
            <path d="M 34 33 Q 40 30 46 33" stroke={s} strokeWidth="2" fill="none"/>
            <path d="M 54 33 Q 60 30 66 33" stroke={s} strokeWidth="2" fill="none"/>
          </>
        ) : (
          <>
            <circle cx="40" cy="33" r="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
            <circle cx="60" cy="33" r="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
          </>
        )}
        <path d="M 42 46 Q 50 52 58 46" stroke={s} strokeWidth="2" fill="none"/>
        <path d="M 22 55 Q 10 75 18 95" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t1"/>
        <path d="M 30 60 Q 20 80 25 100" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t2"/>
        <path d="M 42 63 Q 38 85 40 105" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t3"/>
        <path d="M 58 63 Q 62 85 60 105" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t4"/>
        <path d="M 70 60 Q 80 80 75 100" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t5"/>
        <path d="M 78 55 Q 90 75 82 95" stroke={p} strokeWidth="6" fill="none" strokeLinecap="round" className="mascot-tentacle t6"/>
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2}>
        <path d="M 20 50 Q 20 15, 50 15 Q 80 15, 80 50 L 80 95 Q 73 85, 65 95 Q 57 105, 50 95 Q 43 85, 35 95 Q 27 105, 20 95 Z" fill={p}/>
        <circle cx="38" cy="48" r="8" fill="white"/>
        <circle cx="62" cy="48" r="8" fill="white"/>
        {sleeping ? (
          <>
            <path d="M 32 49 Q 38 46 44 49" stroke={s} strokeWidth="2" fill="none"/>
            <path d="M 56 49 Q 62 46 68 49" stroke={s} strokeWidth="2" fill="none"/>
          </>
        ) : (
          <>
            <circle cx="38" cy="49" r="5" fill={s} className="mascot-pupil mascot-pupil-left"/>
            <circle cx="62" cy="49" r="5" fill={s} className="mascot-pupil mascot-pupil-right"/>
          </>
        )}
        <ellipse cx="50" cy="65" rx="6" ry="4" fill={s}/>
        <circle cx="28" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
        <circle cx="72" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
      </svg>
    ),
  };
  return designs[type] || designs.robot;
}

export default function SiteMascot() {
  const location = useLocation();
  const [settings, setSettings] = useState<MascotSettings | null>(null);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [posX, setPosX] = useState(100);
  const [direction, setDirection] = useState<1 | -1>(1); // 1=right, -1=left
  const [isWalking, setIsWalking] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{id: number; emoji: string; x: number}[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const animFrameRef = useRef<number>();
  const posRef = useRef(100);
  const dirRef = useRef<1 | -1>(1);
  const pauseTimeoutRef = useRef<NodeJS.Timeout>();
  const spontaneousRef = useRef<NodeJS.Timeout>();
  const emojiIdRef = useRef(0);
  const reactionTimeoutRef = useRef<NodeJS.Timeout>();

  // Load settings once
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

  // Walking animation loop
  useEffect(() => {
    if (!settings?.enabled) return;

    const speed = SPEED_MAP[settings.walk_speed] || 0.7;
    const maxX = typeof window !== "undefined" ? window.innerWidth - 100 : 800;
    let paused = false;

    const walk = () => {
      if (paused) {
        animFrameRef.current = requestAnimationFrame(walk);
        return;
      }

      posRef.current += dirRef.current * speed;

      // Boundary check
      if (posRef.current >= maxX) {
        dirRef.current = -1;
        setDirection(-1);
        // Random pause
        paused = true;
        setIsPaused(true);
        setIsWalking(false);
        const pauseDuration = 2000 + Math.random() * 4000;
        pauseTimeoutRef.current = setTimeout(() => {
          paused = false;
          setIsPaused(false);
          setIsWalking(true);
        }, pauseDuration);
      } else if (posRef.current <= 20) {
        dirRef.current = 1;
        setDirection(1);
        paused = true;
        setIsPaused(true);
        setIsWalking(false);
        const pauseDuration = 2000 + Math.random() * 4000;
        pauseTimeoutRef.current = setTimeout(() => {
          paused = false;
          setIsPaused(false);
          setIsWalking(true);
        }, pauseDuration);
      }

      setPosX(posRef.current);
      animFrameRef.current = requestAnimationFrame(walk);
    };

    animFrameRef.current = requestAnimationFrame(walk);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [settings?.enabled, settings?.walk_speed]);

  // Spontaneous reactions
  useEffect(() => {
    if (!settings?.enabled || !settings.click_reactions) return;
    const interval = (settings.spontaneous_interval || 30) * 1000;

    spontaneousRef.current = setInterval(() => {
      const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      setReaction(r);
      setTimeout(() => setReaction(null), 1500);
    }, interval);

    return () => {
      if (spontaneousRef.current) clearInterval(spontaneousRef.current);
    };
  }, [settings?.enabled, settings?.click_reactions, settings?.spontaneous_interval]);

  // Welcome tooltip on first load
  useEffect(() => {
    if (!settings?.enabled || hasGreeted) return;
    const timer = setTimeout(() => {
      setShowTooltip(true);
      setHasGreeted(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 2000);
    return () => clearTimeout(timer);
  }, [settings?.enabled, hasGreeted]);

  const spawnEmoji = useCallback((x: number) => {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const id = ++emojiIdRef.current;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 1500);
  }, []);

  const handleClick = useCallback(() => {
    if (!settings?.click_reactions) return;
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    setReaction(r);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReaction(null), 1500);

    if (settings.show_emojis) {
      spawnEmoji(posRef.current);
    }
  }, [settings, spawnEmoji]);

  // Don't render if disabled
  if (!settings?.enabled) return null;

  // Hide on mobile if configured
  if (!settings.show_on_mobile && typeof window !== "undefined" && window.innerWidth < 768) return null;

  // Hide on checkout pages
  if (settings.hide_on_checkout && CHECKOUT_PATHS.some(p => location.pathname.startsWith(p))) return null;

  const sleeping = settings.night_mode && isNightTime();
  const size = SIZE_MAP[settings.size] || 70;
  const isAdmin = location.pathname.startsWith("/admin");

  return (
    <>
      <style>{`
        .mascot-walk { animation: mascot-step 0.4s ease-in-out infinite; }
        .mascot-idle-anim .mascot-pupil-left { animation: mascot-look 6s ease-in-out infinite; }
        .mascot-idle-anim .mascot-pupil-right { animation: mascot-look 6s ease-in-out infinite 0.3s; }
        .mascot-idle-anim .mascot-antenna-tip { animation: mascot-glow 2s ease-in-out infinite; }
        .mascot-idle-anim .mascot-tail { animation: mascot-wag 3s ease-in-out infinite; }
        .mascot-idle-anim .mascot-tentacle { animation: mascot-wave-tentacle 4s ease-in-out infinite; }
        .mascot-idle-anim .mascot-tentacle.t2 { animation-delay: 0.3s; }
        .mascot-idle-anim .mascot-tentacle.t3 { animation-delay: 0.6s; }
        .mascot-idle-anim .mascot-tentacle.t4 { animation-delay: 0.9s; }
        .mascot-idle-anim .mascot-tentacle.t5 { animation-delay: 1.2s; }
        .mascot-idle-anim .mascot-tentacle.t6 { animation-delay: 1.5s; }
        .mascot-sleep { animation: mascot-breathe 3s ease-in-out infinite; }
        .mascot-react-wave { animation: mascot-wave-anim 1.2s ease-in-out; }
        .mascot-react-jump { animation: mascot-jump-anim 0.8s ease-out; }
        .mascot-react-spin { animation: mascot-spin-anim 1s ease-in-out; }
        .mascot-react-wiggle { animation: mascot-wiggle-anim 0.8s ease-in-out; }
        .mascot-react-surprise { animation: mascot-surprise-anim 1s ease-in-out; }
        .mascot-react-dance { animation: mascot-dance-anim 1.2s ease-in-out; }
        .mascot-react-nod { animation: mascot-nod-anim 0.8s ease-in-out; }
        .mascot-react-heart { animation: mascot-heart-anim 1s ease-in-out; }
        @keyframes mascot-step { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes mascot-look { 0%,100%{transform:translateX(0)} 30%{transform:translateX(2px)} 70%{transform:translateX(-2px)} }
        @keyframes mascot-glow { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes mascot-wag { 0%,100%{transform:rotate(0)} 25%{transform:rotate(8deg)} 75%{transform:rotate(-8deg)} }
        @keyframes mascot-wave-tentacle { 0%,100%{transform:rotate(0)} 50%{transform:rotate(5deg)} }
        @keyframes mascot-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes mascot-wave-anim { 0%{transform:rotate(0)} 15%{transform:rotate(-15deg)} 30%{transform:rotate(15deg)} 45%{transform:rotate(-10deg)} 60%{transform:rotate(10deg)} 100%{transform:rotate(0)} }
        @keyframes mascot-jump-anim { 0%{transform:translateY(0)} 30%{transform:translateY(-30px) scale(1.1)} 50%{transform:translateY(-30px) scale(1.1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-spin-anim { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes mascot-wiggle-anim { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes mascot-surprise-anim { 0%{transform:scale(1)} 20%{transform:scale(1.3)} 40%{transform:scale(0.9)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes mascot-dance-anim { 0%{transform:rotate(0) translateY(0)} 20%{transform:rotate(-10deg) translateY(-5px)} 40%{transform:rotate(10deg) translateY(-8px)} 60%{transform:rotate(-8deg) translateY(-3px)} 80%{transform:rotate(8deg) translateY(-6px)} 100%{transform:rotate(0) translateY(0)} }
        @keyframes mascot-nod-anim { 0%,100%{transform:translateY(0)} 25%{transform:translateY(5px)} 50%{transform:translateY(0)} 75%{transform:translateY(5px)} }
        @keyframes mascot-heart-anim { 0%{transform:scale(1)} 15%{transform:scale(1.2)} 30%{transform:scale(1)} 45%{transform:scale(1.15)} 60%{transform:scale(1)} 100%{transform:scale(1)} }
        @keyframes emoji-float { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(1.5)} }
        .floating-emoji { animation: emoji-float 1.5s ease-out forwards; pointer-events: none; }
        .mascot-tooltip { animation: tooltip-pop 0.3s ease-out; }
        @keyframes tooltip-pop { 0%{opacity:0;transform:translateY(5px) scale(0.9)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes zzz-float { 0%{opacity:0;transform:translateY(0) scale(0.5)} 50%{opacity:1;transform:translateY(-15px) scale(1)} 100%{opacity:0;transform:translateY(-30px) scale(0.7)} }
        .zzz { animation: zzz-float 2s ease-in-out infinite; }
      `}</style>

      {/* Floating emojis */}
      {floatingEmojis.map(e => (
        <div
          key={e.id}
          className="fixed z-[10000] text-2xl floating-emoji"
          style={{ left: e.x + 20, bottom: isAdmin ? 90 : 70 }}
        >
          {e.emoji}
        </div>
      ))}

      {/* Mascot container */}
      <div
        className={`fixed z-[9999] cursor-pointer select-none ${
          reaction ? `mascot-react-${reaction}` : 
          sleeping ? "mascot-sleep" :
          isWalking ? "mascot-walk" : "mascot-idle-anim"
        }`}
        style={{
          left: posX,
          bottom: isAdmin ? 20 : 10,
          transform: `scaleX(${direction})`,
          opacity: settings.opacity ?? 1,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.18))",
          transition: "opacity 0.3s",
        }}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Welcome tooltip */}
        {showTooltip && settings.welcome_message && (
          <div
            className="mascot-tooltip absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-popover text-popover-foreground text-xs px-3 py-1.5 rounded-full shadow-lg border"
            style={{ transform: `scaleX(${direction}) translateX(-50%)` }}
          >
            {settings.welcome_message}
          </div>
        )}

        {/* Sleeping Zzz */}
        {sleeping && (
          <div className="absolute -top-6 right-0 text-sm font-bold text-muted-foreground zzz">
            💤
          </div>
        )}

        {getMascotSVG(settings.mascot_type, settings.primary_color, settings.secondary_color, size, sleeping)}
      </div>
    </>
  );
}
