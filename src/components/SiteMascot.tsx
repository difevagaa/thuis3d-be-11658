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

const REACTIONS = [
  "wave","jump","spin","wiggle","surprise","dance","nod","heart",
  "backflip","peek","shake","bow","clap","bounce","roll","dizzy",
  "stretch","yawn","sneeze","laugh","blush","wink","salute","celebrate",
  "moonwalk","tiptoe","faceplant","hiccup"
] as const;
type Reaction = typeof REACTIONS[number];

const EMOJIS = ["❤️","⭐","🎉","✨","💫","🌟","😊","🎈","🔥","💖","🦋","🌈","👏","🎶","💪","🤩"];

const CHECKOUT_PATHS = ["/payment","/checkout","/card-payment","/revolut-payment","/payment-processing","/payment-summary","/shipping-info"];

function isNightTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

/* ======= SVG MASCOT DESIGNS ======= */
function getMascotSVG(type: string, p: string, s: string, size: number, sleeping: boolean, walkPhase: number) {
  // walkPhase: 0..1 for leg/arm animation
  const legAngle = Math.sin(walkPhase * Math.PI * 2) * 15;
  const armAngle = Math.sin(walkPhase * Math.PI * 2 + Math.PI) * 12;
  const bodyBob = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 2;
  const eyeShift = Math.sin(walkPhase * Math.PI) * 1.5;
  
  const eyes = (cx1: number, cy1: number, r1: number, cx2: number, cy2: number, r2: number) => sleeping ? (
    <>
      <path d={`M ${cx1-r1} ${cy1} Q ${cx1} ${cy1-3} ${cx1+r1} ${cy1}`} stroke={s} strokeWidth="2" fill="none"/>
      <path d={`M ${cx2-r2} ${cy2} Q ${cx2} ${cy2-3} ${cx2+r2} ${cy2}`} stroke={s} strokeWidth="2" fill="none"/>
    </>
  ) : (
    <>
      <circle cx={cx1+eyeShift} cy={cy1} r={r1*0.6} fill={s} className="mascot-pupil"/>
      <circle cx={cx2+eyeShift} cy={cy2} r={r2*0.6} fill={s} className="mascot-pupil"/>
      <circle cx={cx1+eyeShift+1} cy={cy1-1} r={r1*0.2} fill="white" opacity="0.8"/>
      <circle cx={cx2+eyeShift+1} cy={cy2-1} r={r2*0.2} fill="white" opacity="0.8"/>
    </>
  );

  const designs: Record<string, JSX.Element> = {
    robot: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob})`}>
          <line x1="50" y1="5" x2="50" y2="20" stroke={s} strokeWidth="3"/>
          <circle cx="50" cy="5" r="4" fill={p} className="mascot-antenna-tip"/>
          <rect x="20" y="20" width="60" height="45" rx="12" fill={p}/>
          <circle cx="38" cy="42" r="7" fill="white"/>
          <circle cx="62" cy="42" r="7" fill="white"/>
          {eyes(38,42,7,62,42,7)}
          <path d={sleeping?"M 40 56 Q 50 58 60 56":"M 38 55 Q 50 62 62 55"} stroke={s} strokeWidth="2.5" fill="none"/>
          <rect x="25" y="68" width="50" height="35" rx="8" fill={s}/>
          {/* Arms with rotation */}
          <g transform={`rotate(${armAngle},8,76)`}><rect x="4" y="72" width="18" height="8" rx="4" fill={p}/></g>
          <g transform={`rotate(${-armAngle},92,76)`}><rect x="78" y="72" width="18" height="8" rx="4" fill={p}/></g>
        </g>
        {/* Legs with walking */}
        <g transform={`rotate(${legAngle},36,103)`}><rect x="28" y="103" width="14" height="18" rx="5" fill={p}/></g>
        <g transform={`rotate(${-legAngle},64,103)`}><rect x="58" y="103" width="14" height="18" rx="5" fill={p}/></g>
      </svg>
    ),
    cat: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <polygon points="20,30 30,5 40,30" fill={p}/>
          <polygon points="60,30 70,5 80,30" fill={p}/>
          <polygon points="24,28 30,12 36,28" fill="#FFB6C1"/>
          <polygon points="64,28 70,12 76,28" fill="#FFB6C1"/>
          <ellipse cx="50" cy="45" rx="32" ry="28" fill={p}/>
          <ellipse cx="38" cy="42" rx="6" ry="7" fill="white"/>
          <ellipse cx="62" cy="42" rx="6" ry="7" fill="white"/>
          {eyes(38,43,5,62,43,5)}
          <ellipse cx="50" cy="52" rx="3" ry="2" fill="#FFB6C1"/>
          <line x1="15" y1="50" x2="35" y2="52" stroke={s} strokeWidth="1.5"/>
          <line x1="15" y1="55" x2="35" y2="55" stroke={s} strokeWidth="1.5"/>
          <line x1="65" y1="52" x2="85" y2="50" stroke={s} strokeWidth="1.5"/>
          <line x1="65" y1="55" x2="85" y2="55" stroke={s} strokeWidth="1.5"/>
          <path d={sleeping?"M 45 56 L 55 56":"M 45 55 Q 50 60 55 55"} stroke={s} strokeWidth="1.5" fill="none"/>
          <ellipse cx="50" cy="78" rx="22" ry="16" fill={p}/>
          <path d={`M 72 75 Q ${90+Math.sin(walkPhase*Math.PI*2)*8} ${70+Math.cos(walkPhase*Math.PI*2)*5} 85 60`} stroke={p} strokeWidth="6" fill="none" strokeLinecap="round"/>
        </g>
        {/* Legs */}
        <g transform={`rotate(${legAngle},35,94)`}><ellipse cx="35" cy="100" rx="8" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},65,94)`}><ellipse cx="65" cy="100" rx="8" ry="10" fill={p}/></g>
      </svg>
    ),
    octopus: (
      <svg viewBox="0 0 100 110" width={size} height={size*1.1}>
        <g transform={`translate(0,${-bodyBob})`}>
          <ellipse cx="50" cy="35" rx="30" ry="30" fill={p}/>
          <circle cx="40" cy="32" r="8" fill="white"/>
          <circle cx="60" cy="32" r="8" fill="white"/>
          {eyes(40,33,5,60,33,5)}
          <path d="M 42 46 Q 50 52 58 46" stroke={s} strokeWidth="2" fill="none"/>
        </g>
        {/* Tentacles with wave animation */}
        {[
          {x1:22,y1:55,cx:10+Math.sin(walkPhase*Math.PI*2)*6,cy:75,x2:18,y2:95+Math.sin(walkPhase*Math.PI*2)*4},
          {x1:30,y1:60,cx:20+Math.sin(walkPhase*Math.PI*2+1)*5,cy:80,x2:25,y2:100+Math.sin(walkPhase*Math.PI*2+1)*4},
          {x1:42,y1:63,cx:38+Math.sin(walkPhase*Math.PI*2+2)*4,cy:85,x2:40,y2:105+Math.sin(walkPhase*Math.PI*2+2)*3},
          {x1:58,y1:63,cx:62+Math.sin(walkPhase*Math.PI*2+3)*4,cy:85,x2:60,y2:105+Math.sin(walkPhase*Math.PI*2+3)*3},
          {x1:70,y1:60,cx:80+Math.sin(walkPhase*Math.PI*2+4)*5,cy:80,x2:75,y2:100+Math.sin(walkPhase*Math.PI*2+4)*4},
          {x1:78,y1:55,cx:90+Math.sin(walkPhase*Math.PI*2+5)*6,cy:75,x2:82,y2:95+Math.sin(walkPhase*Math.PI*2+5)*4},
        ].map((t,i) => (
          <path key={i} d={`M ${t.x1} ${t.y1} Q ${t.cx} ${t.cy} ${t.x2} ${t.y2}`} stroke={p} strokeWidth="6" fill="none" strokeLinecap="round"/>
        ))}
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          {/* Wavy bottom */}
          <path d={`M 20 50 Q 20 15, 50 15 Q 80 15, 80 50 L 80 90 Q ${73+Math.sin(walkPhase*Math.PI*2)*3} ${82}, ${65} ${90+Math.sin(walkPhase*Math.PI*2+1)*4} Q ${57} ${98+Math.sin(walkPhase*Math.PI*2+2)*3}, ${50} ${90+Math.sin(walkPhase*Math.PI*2+3)*4} Q ${43} ${82+Math.sin(walkPhase*Math.PI*2+4)*3}, ${35} ${90+Math.sin(walkPhase*Math.PI*2+5)*4} Q ${27} ${98+Math.sin(walkPhase*Math.PI*2+6)*3}, 20 90 Z`} fill={p}/>
          <circle cx="38" cy="48" r="8" fill="white"/>
          <circle cx="62" cy="48" r="8" fill="white"/>
          {eyes(38,49,5,62,49,5)}
          <ellipse cx="50" cy="65" rx="6" ry="4" fill={s}/>
          <circle cx="28" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
          <circle cx="72" cy="58" r="5" fill="#FFB6C1" opacity="0.5"/>
          {/* Little arms */}
          <g transform={`rotate(${armAngle},22,55)`}><ellipse cx="16" cy="58" rx="6" ry="4" fill={p} opacity="0.7"/></g>
          <g transform={`rotate(${-armAngle},78,55)`}><ellipse cx="84" cy="58" rx="6" ry="4" fill={p} opacity="0.7"/></g>
        </g>
      </svg>
    ),
    penguin: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob})`}>
          <ellipse cx="50" cy="50" rx="30" ry="35" fill="#1a1a2e"/>
          <ellipse cx="50" cy="55" rx="20" ry="25" fill="white"/>
          <circle cx="40" cy="42" r="6" fill="white"/>
          <circle cx="60" cy="42" r="6" fill="white"/>
          {eyes(40,42,4,60,42,4)}
          <polygon points="45,52 55,52 50,58" fill="#FF8C00"/>
          <g transform={`rotate(${armAngle*1.2},22,55)`}><ellipse cx="18" cy="60" rx="10" ry="5" fill="#1a1a2e"/></g>
          <g transform={`rotate(${-armAngle*1.2},78,55)`}><ellipse cx="82" cy="60" rx="10" ry="5" fill="#1a1a2e"/></g>
        </g>
        <g transform={`rotate(${legAngle*0.8},40,85)`}><ellipse cx="40" cy="90" rx="10" ry="5" fill="#FF8C00"/></g>
        <g transform={`rotate(${-legAngle*0.8},60,85)`}><ellipse cx="60" cy="90" rx="10" ry="5" fill="#FF8C00"/></g>
      </svg>
    ),
    bunny: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob})`}>
          <ellipse cx="40" cy="18" rx="8" ry="22" fill={p}/>
          <ellipse cx="60" cy="18" rx="8" ry="22" fill={p}/>
          <ellipse cx="40" cy="18" rx="5" ry="18" fill="#FFB6C1"/>
          <ellipse cx="60" cy="18" rx="5" ry="18" fill="#FFB6C1"/>
          <circle cx="50" cy="50" r="25" fill={p}/>
          <circle cx="42" cy="46" r="5" fill="white"/>
          <circle cx="58" cy="46" r="5" fill="white"/>
          {eyes(42,46,3.5,58,46,3.5)}
          <ellipse cx="50" cy="54" rx="3" ry="2" fill="#FFB6C1"/>
          <line x1="30" y1="52" x2="18" y2="50" stroke={s} strokeWidth="1"/>
          <line x1="30" y1="55" x2="18" y2="56" stroke={s} strokeWidth="1"/>
          <line x1="70" y1="52" x2="82" y2="50" stroke={s} strokeWidth="1"/>
          <line x1="70" y1="55" x2="82" y2="56" stroke={s} strokeWidth="1"/>
          <ellipse cx="50" cy="82" rx="18" ry="16" fill={p}/>
          <circle cx="68" cy="80" r="6" fill={p}/>
        </g>
        <g transform={`rotate(${legAngle},40,98)`}><ellipse cx="38" cy="102" rx="8" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},60,98)`}><ellipse cx="62" cy="102" rx="8" ry="10" fill={p}/></g>
      </svg>
    ),
    fox: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <polygon points="18,35 32,5 42,35" fill={p}/>
          <polygon points="58,35 68,5 82,35" fill={p}/>
          <polygon points="22,33 32,12 38,33" fill="white"/>
          <polygon points="62,33 68,12 78,33" fill="white"/>
          <ellipse cx="50" cy="48" rx="30" ry="25" fill={p}/>
          <ellipse cx="50" cy="52" rx="15" ry="12" fill="white"/>
          <circle cx="40" cy="44" r="5" fill="white"/>
          <circle cx="60" cy="44" r="5" fill="white"/>
          {eyes(40,44,3.5,60,44,3.5)}
          <circle cx="50" cy="50" r="3" fill="#333"/>
          <ellipse cx="50" cy="80" rx="18" ry="14" fill={p}/>
          <path d={`M 68 78 Q ${85+Math.sin(walkPhase*Math.PI*2)*6} ${72} ${80+Math.sin(walkPhase*Math.PI*2)*4} ${60}`} stroke={p} strokeWidth="8" fill="none" strokeLinecap="round"/>
          <path d={`M ${80+Math.sin(walkPhase*Math.PI*2)*4} ${60}`} stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
        </g>
        <g transform={`rotate(${legAngle},38,94)`}><ellipse cx="38" cy="100" rx="7" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,94)`}><ellipse cx="62" cy="100" rx="7" ry="10" fill={p}/></g>
      </svg>
    ),
    panda: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <circle cx="50" cy="42" r="30" fill="white"/>
          <circle cx="36" cy="35" r="10" fill="#1a1a2e"/>
          <circle cx="64" cy="35" r="10" fill="#1a1a2e"/>
          <circle cx="36" cy="35" r="6" fill="white"/>
          <circle cx="64" cy="35" r="6" fill="white"/>
          {eyes(36,35,4,64,35,4)}
          <ellipse cx="50" cy="48" rx="4" ry="3" fill="#1a1a2e"/>
          <path d="M 44 52 Q 50 56 56 52" stroke="#1a1a2e" strokeWidth="1.5" fill="none"/>
          <circle cx="32" cy="20" r="10" fill="#1a1a2e"/>
          <circle cx="68" cy="20" r="10" fill="#1a1a2e"/>
          <ellipse cx="50" cy="80" rx="22" ry="18" fill="white"/>
          <g transform={`rotate(${armAngle},24,65)`}><ellipse cx="20" cy="68" rx="10" ry="6" fill="#1a1a2e"/></g>
          <g transform={`rotate(${-armAngle},76,65)`}><ellipse cx="80" cy="68" rx="10" ry="6" fill="#1a1a2e"/></g>
        </g>
        <g transform={`rotate(${legAngle},38,95)`}><ellipse cx="38" cy="100" rx="9" ry="8" fill="#1a1a2e"/></g>
        <g transform={`rotate(${-legAngle},62,95)`}><ellipse cx="62" cy="100" rx="9" ry="8" fill="#1a1a2e"/></g>
      </svg>
    ),
    alien: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <ellipse cx="50" cy="38" rx="32" ry="28" fill={p}/>
          <ellipse cx="36" cy="36" rx="10" ry="8" fill="white"/>
          <ellipse cx="64" cy="36" rx="10" ry="8" fill="white"/>
          {eyes(36,36,6,64,36,6)}
          <ellipse cx="50" cy="52" rx="4" ry="2" fill={s}/>
          <line x1="40" y1="8" x2="35" y2="-2" stroke={p} strokeWidth="2"/>
          <circle cx="35" cy="-4" r="3" fill={s}/>
          <line x1="60" y1="8" x2="65" y2="-2" stroke={p} strokeWidth="2"/>
          <circle cx="65" cy="-4" r="3" fill={s}/>
          <ellipse cx="50" cy="78" rx="16" ry="18" fill={p}/>
          <g transform={`rotate(${armAngle},24,62)`}><rect x="14" y="60" width="18" height="5" rx="2.5" fill={p}/></g>
          <g transform={`rotate(${-armAngle},76,62)`}><rect x="68" y="60" width="18" height="5" rx="2.5" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},40,96)`}><rect x="36" y="96" width="8" height="16" rx="4" fill={p}/></g>
        <g transform={`rotate(${-legAngle},60,96)`}><rect x="56" y="96" width="8" height="16" rx="4" fill={p}/></g>
      </svg>
    ),
    bear: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <circle cx="30" cy="22" r="12" fill={p}/>
          <circle cx="70" cy="22" r="12" fill={p}/>
          <circle cx="30" cy="22" r="7" fill={s}/>
          <circle cx="70" cy="22" r="7" fill={s}/>
          <circle cx="50" cy="42" r="28" fill={p}/>
          <ellipse cx="50" cy="48" rx="16" ry="12" fill={s} opacity="0.3"/>
          <circle cx="40" cy="38" r="5" fill="white"/>
          <circle cx="60" cy="38" r="5" fill="white"/>
          {eyes(40,38,3.5,60,38,3.5)}
          <ellipse cx="50" cy="47" rx="4" ry="3" fill="#333"/>
          <path d="M 46 50 Q 50 54 54 50" stroke="#333" strokeWidth="1.5" fill="none"/>
          <ellipse cx="50" cy="82" rx="20" ry="16" fill={p}/>
          <g transform={`rotate(${armAngle},24,60)`}><ellipse cx="20" cy="64" rx="10" ry="6" fill={p}/></g>
          <g transform={`rotate(${-armAngle},76,60)`}><ellipse cx="80" cy="64" rx="10" ry="6" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},38,96)`}><ellipse cx="38" cy="102" rx="9" ry="8" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,96)`}><ellipse cx="62" cy="102" rx="9" ry="8" fill={p}/></g>
      </svg>
    ),
    dragon: (
      <svg viewBox="0 0 110 120" width={size*1.1} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <polygon points="25,25 15,5 35,20" fill={s}/>
          <polygon points="75,25 85,5 65,20" fill={s}/>
          <ellipse cx="50" cy="42" rx="28" ry="25" fill={p}/>
          <circle cx="40" cy="38" r="6" fill="white"/>
          <circle cx="60" cy="38" r="6" fill="white"/>
          {eyes(40,38,4,60,38,4)}
          <path d="M 42 52 Q 50 46 58 52" stroke={s} strokeWidth="2" fill="none"/>
          <polygon points="35,20 40,8 45,20" fill={p}/>
          <polygon points="45,18 50,6 55,18" fill={p}/>
          <polygon points="55,20 60,8 65,20" fill={p}/>
          <ellipse cx="50" cy="78" rx="18" ry="14" fill={p}/>
          <ellipse cx="50" cy="78" rx="12" ry="10" fill={s} opacity="0.3"/>
          <g transform={`rotate(${armAngle},22,58)`}><ellipse cx="18" cy="62" rx="10" ry="5" fill={p}/></g>
          <g transform={`rotate(${-armAngle},78,58)`}><ellipse cx="82" cy="62" rx="10" ry="5" fill={p}/></g>
          <path d={`M 68 76 Q ${88+Math.sin(walkPhase*Math.PI*2)*8} 70 ${95+Math.sin(walkPhase*Math.PI*2)*5} 55`} stroke={p} strokeWidth="6" fill="none" strokeLinecap="round"/>
          <polygon points={`${95+Math.sin(walkPhase*Math.PI*2)*5},55 ${100+Math.sin(walkPhase*Math.PI*2)*5},50 ${90+Math.sin(walkPhase*Math.PI*2)*5},48`} fill={s}/>
        </g>
        <g transform={`rotate(${legAngle},38,92)`}><ellipse cx="38" cy="98" rx="8" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,92)`}><ellipse cx="62" cy="98" rx="8" ry="10" fill={p}/></g>
      </svg>
    ),
    unicorn: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob})`}>
          <polygon points="50,2 45,28 55,28" fill="#FFD700"/>
          <ellipse cx="50" cy="45" rx="28" ry="24" fill={p}/>
          <circle cx="40" cy="42" r="5" fill="white"/>
          <circle cx="58" cy="42" r="5" fill="white"/>
          {eyes(40,42,3.5,58,42,3.5)}
          <path d="M 44 52 Q 50 56 56 52" stroke={s} strokeWidth="1.5" fill="none"/>
          <path d={`M 20 42 Q 5 ${35+Math.sin(walkPhase*Math.PI*2)*3} 10 50`} stroke="#FF69B4" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d={`M 20 42 Q 5 ${40+Math.sin(walkPhase*Math.PI*2+1)*3} 8 55`} stroke="#87CEEB" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <circle cx="38" cy="50" r="4" fill="#FFB6C1" opacity="0.4"/>
          <circle cx="62" cy="50" r="4" fill="#FFB6C1" opacity="0.4"/>
          <ellipse cx="50" cy="82" rx="20" ry="16" fill={p}/>
          <g transform={`rotate(${armAngle},22,62)`}><ellipse cx="18" cy="66" rx="8" ry="5" fill={p}/></g>
          <g transform={`rotate(${-armAngle},78,62)`}><ellipse cx="82" cy="66" rx="8" ry="5" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},38,98)`}><ellipse cx="38" cy="104" rx="7" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,98)`}><ellipse cx="62" cy="104" rx="7" ry="10" fill={p}/></g>
      </svg>
    ),
    dino: (
      <svg viewBox="0 0 110 120" width={size*1.1} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob})`}>
          <polygon points="38,18 42,8 46,18" fill={s}/>
          <polygon points="46,15 50,5 54,15" fill={s}/>
          <polygon points="54,18 58,8 62,18" fill={s}/>
          <ellipse cx="50" cy="42" rx="28" ry="26" fill={p}/>
          <circle cx="40" cy="38" r="6" fill="white"/>
          <circle cx="60" cy="38" r="6" fill="white"/>
          {eyes(40,38,4,60,38,4)}
          <path d="M 42 52 Q 50 58 58 52" stroke={s} strokeWidth="2" fill="none"/>
          <ellipse cx="50" cy="82" rx="22" ry="16" fill={p}/>
          <ellipse cx="50" cy="82" rx="14" ry="10" fill={s} opacity="0.2"/>
          <g transform={`rotate(${armAngle*0.8},24,58)`}><ellipse cx="20" cy="62" rx="12" ry="5" fill={p}/></g>
          <g transform={`rotate(${-armAngle*0.8},76,58)`}><ellipse cx="80" cy="62" rx="12" ry="5" fill={p}/></g>
          <path d={`M 72 82 Q ${88+Math.sin(walkPhase*Math.PI*2)*5} 90 ${92+Math.sin(walkPhase*Math.PI*2)*3} 100`} stroke={p} strokeWidth="8" fill="none" strokeLinecap="round"/>
        </g>
        <g transform={`rotate(${legAngle},38,96)`}><rect x="32" y="96" width="12" height="18" rx="6" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,96)`}><rect x="56" y="96" width="12" height="18" rx="6" fill={p}/></g>
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
  const [posY, setPosY] = useState(10);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isWalking, setIsWalking] = useState(true);
  const [walkPhase, setWalkPhase] = useState(0);
  const [floatingEmojis, setFloatingEmojis] = useState<{id:number;emoji:string;x:number}[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const animFrameRef = useRef<number>();
  const posRef = useRef(100);
  const dirRef = useRef<1 | -1>(1);
  const pauseTimeoutRef = useRef<NodeJS.Timeout>();
  const spontaneousRef = useRef<NodeJS.Timeout>();
  const emojiIdRef = useRef(0);
  const reactionTimeoutRef = useRef<NodeJS.Timeout>();
  const walkPhaseRef = useRef(0);
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 });
  const posYRef = useRef(10);

  useEffect(() => {
    supabase.from("site_mascot_settings").select("*").limit(1).maybeSingle()
      .then(({ data }) => { if (data) setSettings(data as unknown as MascotSettings); });
  }, []);

  // Walking animation loop
  useEffect(() => {
    if (!settings?.enabled || isDragging) return;

    const speed = SPEED_MAP[settings.walk_speed] || 0.7;
    let paused = false;
    let frameCount = 0;

    const walk = () => {
      frameCount++;
      
      // Update walk phase for limb animations (~60fps, complete cycle every ~40 frames)
      walkPhaseRef.current = (walkPhaseRef.current + 0.04) % 1;
      if (frameCount % 3 === 0) setWalkPhase(walkPhaseRef.current);

      if (paused) {
        animFrameRef.current = requestAnimationFrame(walk);
        return;
      }

      const maxX = typeof window !== "undefined" ? window.innerWidth - 100 : 800;
      posRef.current += dirRef.current * speed;

      if (posRef.current >= maxX || posRef.current <= 20) {
        dirRef.current = (posRef.current >= maxX ? -1 : 1) as 1 | -1;
        setDirection(dirRef.current);
        paused = true;
        setIsWalking(false);
        const pauseDuration = 2000 + Math.random() * 4000;
        pauseTimeoutRef.current = setTimeout(() => {
          paused = false;
          setIsWalking(true);
        }, pauseDuration);
      }

      if (frameCount % 2 === 0) setPosX(posRef.current);
      animFrameRef.current = requestAnimationFrame(walk);
    };

    animFrameRef.current = requestAnimationFrame(walk);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [settings?.enabled, settings?.walk_speed, isDragging]);

  // Spontaneous reactions
  useEffect(() => {
    if (!settings?.enabled || !settings.click_reactions) return;
    const interval = (settings.spontaneous_interval || 30) * 1000;
    spontaneousRef.current = setInterval(() => {
      const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      setReaction(r);
      setTimeout(() => setReaction(null), 1500);
    }, interval);
    return () => { if (spontaneousRef.current) clearInterval(spontaneousRef.current); };
  }, [settings?.enabled, settings?.click_reactions, settings?.spontaneous_interval]);

  // Welcome tooltip
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
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== id)), 1500);
  }, []);

  const handleClick = useCallback(() => {
    if (isDragging) return;
    if (!settings?.click_reactions) return;
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    setReaction(r);
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = setTimeout(() => setReaction(null), 1500);
    if (settings.show_emojis) spawnEmoji(posRef.current);
  }, [settings, spawnEmoji, isDragging]);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragRef.current = { active: true, offsetX: e.clientX - posRef.current, offsetY: e.clientY - (window.innerHeight - posYRef.current) };
    setIsDragging(true);
    (e.target as HTMLElement).closest('.mascot-container')?.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const newX = e.clientX - dragRef.current.offsetX;
    const newBottom = window.innerHeight - (e.clientY - dragRef.current.offsetY + (posYRef.current - 10));
    posRef.current = Math.max(0, Math.min(newX, window.innerWidth - 80));
    posYRef.current = Math.max(0, Math.min(window.innerHeight - 100, window.innerHeight - e.clientY + dragRef.current.offsetY));
    setPosX(posRef.current);
    setPosY(posYRef.current);
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current.active = false;
    setTimeout(() => setIsDragging(false), 100);
  }, []);

  if (!settings?.enabled) return null;
  if (!settings.show_on_mobile && typeof window !== "undefined" && window.innerWidth < 768) return null;
  if (settings.hide_on_checkout && CHECKOUT_PATHS.some(p => location.pathname.startsWith(p))) return null;

  const sleeping = settings.night_mode && isNightTime();
  const size = SIZE_MAP[settings.size] || 70;
  const isAdmin = location.pathname.startsWith("/admin");

  const reactionClass = reaction ? `mascot-react-${reaction}` : "";

  return (
    <>
      <style>{`
        @keyframes mascot-step { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes mascot-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        @keyframes mascot-react-wave { 0%{transform:rotate(0)} 15%{transform:rotate(-15deg)} 30%{transform:rotate(15deg)} 45%{transform:rotate(-10deg)} 60%{transform:rotate(10deg)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-jump { 0%{transform:translateY(0)} 30%{transform:translateY(-30px) scale(1.1)} 50%{transform:translateY(-30px) scale(1.1)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-react-spin { 0%{transform:rotate(0)} 100%{transform:rotate(360deg)} }
        @keyframes mascot-react-wiggle { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes mascot-react-surprise { 0%{transform:scale(1)} 20%{transform:scale(1.3)} 40%{transform:scale(0.9)} 60%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes mascot-react-dance { 0%{transform:rotate(0) translateY(0)} 20%{transform:rotate(-10deg) translateY(-5px)} 40%{transform:rotate(10deg) translateY(-8px)} 60%{transform:rotate(-8deg) translateY(-3px)} 80%{transform:rotate(8deg) translateY(-6px)} 100%{transform:rotate(0) translateY(0)} }
        @keyframes mascot-react-nod { 0%,100%{transform:translateY(0)} 25%{transform:translateY(5px)} 50%{transform:translateY(0)} 75%{transform:translateY(5px)} }
        @keyframes mascot-react-heart { 0%{transform:scale(1)} 15%{transform:scale(1.2)} 30%{transform:scale(1)} 45%{transform:scale(1.15)} 60%{transform:scale(1)} 100%{transform:scale(1)} }
        @keyframes mascot-react-backflip { 0%{transform:rotate(0) translateY(0)} 50%{transform:rotate(-180deg) translateY(-30px)} 100%{transform:rotate(-360deg) translateY(0)} }
        @keyframes mascot-react-peek { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(20px) scale(0.8)} 50%{transform:translateY(20px) scale(0.8)} 70%{transform:translateY(0) scale(1.05)} }
        @keyframes mascot-react-shake { 0%,100%{transform:rotate(0)} 10%{transform:rotate(-12deg)} 20%{transform:rotate(12deg)} 30%{transform:rotate(-10deg)} 40%{transform:rotate(10deg)} 50%{transform:rotate(-6deg)} 60%{transform:rotate(6deg)} 70%{transform:rotate(-3deg)} 80%{transform:rotate(3deg)} }
        @keyframes mascot-react-bow { 0%,100%{transform:rotate(0)} 40%{transform:rotate(20deg)} 60%{transform:rotate(20deg)} }
        @keyframes mascot-react-clap { 0%,100%{transform:scaleX(1)} 15%{transform:scaleX(0.85)} 30%{transform:scaleX(1)} 45%{transform:scaleX(0.85)} 60%{transform:scaleX(1)} 75%{transform:scaleX(0.85)} }
        @keyframes mascot-react-bounce { 0%,100%{transform:translateY(0)} 20%{transform:translateY(-15px)} 40%{transform:translateY(0)} 60%{transform:translateY(-10px)} 80%{transform:translateY(0)} }
        @keyframes mascot-react-roll { 0%{transform:rotate(0) translateX(0)} 50%{transform:rotate(360deg) translateX(30px)} 100%{transform:rotate(720deg) translateX(0)} }
        @keyframes mascot-react-dizzy { 0%{transform:rotate(0)} 25%{transform:rotate(15deg) translateX(5px)} 50%{transform:rotate(-15deg) translateX(-5px)} 75%{transform:rotate(10deg) translateX(3px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-stretch { 0%,100%{transform:scaleY(1)} 40%{transform:scaleY(1.25) scaleX(0.85)} 60%{transform:scaleY(1.25) scaleX(0.85)} }
        @keyframes mascot-react-yawn { 0%,100%{transform:scale(1)} 30%{transform:scale(1.08) translateY(-3px)} 50%{transform:scale(1.12) translateY(-5px)} 70%{transform:scale(1.08) translateY(-3px)} }
        @keyframes mascot-react-sneeze { 0%{transform:translateY(0) scale(1)} 40%{transform:translateY(-5px) scale(1.05)} 50%{transform:translateY(8px) scale(0.9)} 60%{transform:translateY(0) scale(1.15)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-react-laugh { 0%,100%{transform:translateY(0) rotate(0)} 10%{transform:translateY(-3px) rotate(-3deg)} 20%{transform:translateY(0) rotate(3deg)} 30%{transform:translateY(-3px) rotate(-3deg)} 40%{transform:translateY(0) rotate(3deg)} 50%{transform:translateY(-3px) rotate(-3deg)} 60%{transform:translateY(0) rotate(3deg)} }
        @keyframes mascot-react-blush { 0%,100%{transform:scale(1)} 30%{transform:scale(1.05)} 50%{transform:scale(0.95) rotate(5deg)} 70%{transform:scale(1.05) rotate(-5deg)} }
        @keyframes mascot-react-wink { 0%,100%{transform:scaleY(1)} 40%{transform:scaleY(0.9)} 50%{transform:scaleY(1.05)} }
        @keyframes mascot-react-salute { 0%{transform:rotate(0)} 20%{transform:rotate(-5deg) translateY(-3px)} 80%{transform:rotate(-5deg) translateY(-3px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-celebrate { 0%{transform:scale(1) rotate(0)} 20%{transform:scale(1.15) rotate(5deg)} 40%{transform:scale(1.1) rotate(-5deg)} 60%{transform:scale(1.15) rotate(5deg) translateY(-10px)} 80%{transform:scale(1.1) rotate(-3deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes mascot-react-moonwalk { 0%{transform:translateX(0) scaleX(-1)} 50%{transform:translateX(-30px) scaleX(-1)} 100%{transform:translateX(0) scaleX(-1)} }
        @keyframes mascot-react-tiptoe { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(-8px) scaleY(1.05)} }
        @keyframes mascot-react-faceplant { 0%{transform:rotate(0)} 50%{transform:rotate(90deg) translateY(10px)} 80%{transform:rotate(90deg) translateY(10px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-hiccup { 0%,100%{transform:translateY(0) scale(1)} 15%{transform:translateY(-8px) scale(1.08)} 30%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.06)} 65%{transform:translateY(0) scale(1)} }
        .mascot-react-wave{animation:mascot-react-wave 1.2s ease-in-out}
        .mascot-react-jump{animation:mascot-react-jump 0.8s ease-out}
        .mascot-react-spin{animation:mascot-react-spin 1s ease-in-out}
        .mascot-react-wiggle{animation:mascot-react-wiggle 0.8s ease-in-out}
        .mascot-react-surprise{animation:mascot-react-surprise 1s ease-in-out}
        .mascot-react-dance{animation:mascot-react-dance 1.2s ease-in-out}
        .mascot-react-nod{animation:mascot-react-nod 0.8s ease-in-out}
        .mascot-react-heart{animation:mascot-react-heart 1s ease-in-out}
        .mascot-react-backflip{animation:mascot-react-backflip 1s ease-in-out}
        .mascot-react-peek{animation:mascot-react-peek 1.2s ease-in-out}
        .mascot-react-shake{animation:mascot-react-shake 0.8s ease-in-out}
        .mascot-react-bow{animation:mascot-react-bow 1.2s ease-in-out}
        .mascot-react-clap{animation:mascot-react-clap 1s ease-in-out}
        .mascot-react-bounce{animation:mascot-react-bounce 1s ease-in-out}
        .mascot-react-roll{animation:mascot-react-roll 1.2s ease-in-out}
        .mascot-react-dizzy{animation:mascot-react-dizzy 1s ease-in-out}
        .mascot-react-stretch{animation:mascot-react-stretch 1.2s ease-in-out}
        .mascot-react-yawn{animation:mascot-react-yawn 1.5s ease-in-out}
        .mascot-react-sneeze{animation:mascot-react-sneeze 0.8s ease-in-out}
        .mascot-react-laugh{animation:mascot-react-laugh 1.2s ease-in-out}
        .mascot-react-blush{animation:mascot-react-blush 1.2s ease-in-out}
        .mascot-react-wink{animation:mascot-react-wink 0.8s ease-in-out}
        .mascot-react-salute{animation:mascot-react-salute 1.2s ease-in-out}
        .mascot-react-celebrate{animation:mascot-react-celebrate 1.2s ease-in-out}
        .mascot-react-moonwalk{animation:mascot-react-moonwalk 1.5s ease-in-out}
        .mascot-react-tiptoe{animation:mascot-react-tiptoe 1s ease-in-out}
        .mascot-react-faceplant{animation:mascot-react-faceplant 1.5s ease-in-out}
        .mascot-react-hiccup{animation:mascot-react-hiccup 1s ease-in-out}
        @keyframes emoji-float { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(-60px) scale(1.5)} }
        .floating-emoji { animation: emoji-float 1.5s ease-out forwards; pointer-events: none; }
        .mascot-tooltip { animation: tooltip-pop 0.3s ease-out; }
        @keyframes tooltip-pop { 0%{opacity:0;transform:translateY(5px) scale(0.9)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes zzz-float { 0%{opacity:0;transform:translateY(0) scale(0.5)} 50%{opacity:1;transform:translateY(-15px) scale(1)} 100%{opacity:0;transform:translateY(-30px) scale(0.7)} }
        .zzz { animation: zzz-float 2s ease-in-out infinite; }
        .mascot-sleep { animation: mascot-breathe 3s ease-in-out infinite; }
      `}</style>

      {/* Floating emojis */}
      {floatingEmojis.map(e => (
        <div key={e.id} className="fixed z-[10000] text-2xl floating-emoji" style={{ left: e.x + 20, bottom: posY + 60 }}>
          {e.emoji}
        </div>
      ))}

      {/* Mascot container */}
      <div
        className={`mascot-container fixed z-[9999] select-none touch-none ${reactionClass} ${sleeping ? "mascot-sleep" : ""}`}
        style={{
          left: posX,
          bottom: posY,
          transform: `scaleX(${direction})`,
          opacity: settings.opacity ?? 1,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.18))",
          transition: isDragging ? "none" : "opacity 0.3s",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {showTooltip && settings.welcome_message && (
          <div
            className="mascot-tooltip absolute -top-12 left-1/2 -translate-x-1/2 bg-card text-card-foreground text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-border"
            style={{ transform: `scaleX(${direction}) translateX(-50%)` }}
          >
            {settings.welcome_message}
          </div>
        )}

        {sleeping && (
          <div className="absolute -top-6 right-0 text-lg zzz" style={{ transform: `scaleX(${direction})` }}>💤</div>
        )}

        {getMascotSVG(settings.mascot_type, settings.primary_color, settings.secondary_color, size, sleeping, walkPhase)}
      </div>
    </>
  );
}
