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
  "moonwalk","tiptoe","faceplant","hiccup",
  "lick","earTwitch","headTilt","sniff","scratch","playBall","chase",
  "purr","pounce","tailWag","belly","nuzzle","howl","dig","fetch",
  "blink","curious","startle","groom","rollOver",
  // 50 new natural reactions
  "washFace","kneadPaws","archBack","chaseTail","batAtToy","boxPush","sunbathe","purrVibrate","hiss","slowBlink",
  "shakeFur","sitPretty","rollOnBack","sniffGround","pointNose","tipTap","zoomies","headShake","pawGive","playDead",
  "waddle","slideBelly","fishCatch","huddle","flipperClap",
  "glitch","scanMode","reboot","laserEyes","systemUpdate",
  "phase","spook","vanish","haunt","ghostFloat",
  "sneakWalk","peekAround","doubleJump","cartwheel","tipHat",
  "thinking","confetti","flexMuscle","facepalm","dab",
  "meditation","electricShock","bubbleBlow","rainbow","tornado"
] as const;
type Reaction = typeof REACTIONS[number];

const EMOJIS = ["❤️","⭐","🎉","✨","💫","🌟","😊","🎈","🔥","💖","🦋","🌈","👏","🎶","💪","🤩","🐾","🧶","🦴","🐟"];

const CHECKOUT_PATHS = ["/payment","/checkout","/card-payment","/revolut-payment","/payment-processing","/payment-summary","/shipping-info","/pago","/pago-tarjeta","/pago-revolut","/pago-en-proceso","/resumen-pago","/informacion-envio"];

function isNightTime() {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

/* ======= SVG MASCOT DESIGNS with fluid natural animations ======= */
function getMascotSVG(type: string, p: string, s: string, size: number, sleeping: boolean, walkPhase: number, reactionAnim: Reaction | null) {
  const legAngle = Math.sin(walkPhase * Math.PI * 2) * 18;
  const armAngle = Math.sin(walkPhase * Math.PI * 2 + Math.PI) * 14;
  const bodyBob = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 3;
  const eyeShift = Math.sin(walkPhase * Math.PI) * 2;
  const breathe = Math.sin(walkPhase * Math.PI * 0.5) * 0.5;
  
  // Natural micro-animations
  const earTwitch = reactionAnim === 'earTwitch' ? Math.sin(walkPhase * Math.PI * 8) * 12 : Math.sin(walkPhase * Math.PI * 0.3) * 2;
  const tailWave = Math.sin(walkPhase * Math.PI * 2.5) * 15;
  const blinkCycle = Math.sin(walkPhase * Math.PI * 0.15);
  const isBlinking = blinkCycle > 0.97;
  const mouthOpen = reactionAnim === 'lick' || reactionAnim === 'howl' || reactionAnim === 'yawn';
  const headTilt = reactionAnim === 'headTilt' ? Math.sin(walkPhase * Math.PI * 3) * 8 : reactionAnim === 'curious' ? 6 : 0;
  const sniffBob = reactionAnim === 'sniff' ? Math.sin(walkPhase * Math.PI * 6) * 3 : 0;
  const scratchPhase = reactionAnim === 'scratch' ? Math.sin(walkPhase * Math.PI * 8) * 20 : 0;
  const pounceSquash = reactionAnim === 'pounce' ? (Math.sin(walkPhase * Math.PI * 4) > 0 ? 0.85 : 1.15) : 1;
  const bellyUp = reactionAnim === 'belly' || reactionAnim === 'rollOver';
  const groomLick = reactionAnim === 'groom';

  const eyes = (cx1: number, cy1: number, r1: number, cx2: number, cy2: number, r2: number) => {
    if (sleeping || isBlinking) return (
      <>
        <path d={`M ${cx1-r1} ${cy1} Q ${cx1} ${cy1-3} ${cx1+r1} ${cy1}`} stroke={s} strokeWidth="2" fill="none"/>
        <path d={`M ${cx2-r2} ${cy2} Q ${cx2} ${cy2-3} ${cx2+r2} ${cy2}`} stroke={s} strokeWidth="2" fill="none"/>
      </>
    );
    const pupilSize = reactionAnim === 'surprise' || reactionAnim === 'startle' ? r1 * 0.8 : r1 * 0.55;
    const curiousShift = reactionAnim === 'curious' ? 2 : 0;
    return (
      <>
        <circle cx={cx1} cy={cy1} r={r1} fill="white"/>
        <circle cx={cx2} cy={cy2} r={r2} fill="white"/>
        <circle cx={cx1+eyeShift+curiousShift} cy={cy1+sniffBob} r={pupilSize} fill={s}/>
        <circle cx={cx2+eyeShift+curiousShift} cy={cy2+sniffBob} r={pupilSize} fill={s}/>
        <circle cx={cx1+eyeShift+curiousShift+1} cy={cy1-1} r={r1*0.18} fill="white" opacity="0.85"/>
        <circle cx={cx2+eyeShift+curiousShift+1} cy={cy2-1} r={r2*0.18} fill="white" opacity="0.85"/>
      </>
    );
  };

  const mouth = (cx: number, cy: number, w: number) => {
    if (mouthOpen) return <ellipse cx={cx} cy={cy+2} rx={w*0.6} ry={w*0.45} fill={s} opacity="0.7"/>;
    if (reactionAnim === 'purr') return <path d={`M ${cx-w} ${cy} Q ${cx} ${cy+3+Math.sin(walkPhase*Math.PI*4)*2} ${cx+w} ${cy}`} stroke={s} strokeWidth="1.5" fill="none"/>;
    if (sleeping) return <path d={`M ${cx-w*0.5} ${cy} L ${cx+w*0.5} ${cy}`} stroke={s} strokeWidth="1.5" fill="none"/>;
    return <path d={`M ${cx-w} ${cy} Q ${cx} ${cy+4} ${cx+w} ${cy}`} stroke={s} strokeWidth="1.5" fill="none"/>;
  };

  // Lick tongue element
  const tongue = (cx: number, cy: number) => {
    if (reactionAnim !== 'lick' && !groomLick) return null;
    const tongueLen = Math.sin(walkPhase * Math.PI * 3) * 8 + 6;
    return <ellipse cx={cx + (groomLick ? -8 : 0)} cy={cy + tongueLen * 0.5} rx={3} ry={tongueLen * 0.5} fill="#FF6B9D" opacity="0.9"/>;
  };

  // Play ball element
  const playBall = () => {
    if (reactionAnim !== 'playBall' && reactionAnim !== 'fetch') return null;
    const ballX = 50 + Math.sin(walkPhase * Math.PI * 4) * 20;
    const ballY = 30 + Math.abs(Math.sin(walkPhase * Math.PI * 6)) * 15;
    return <circle cx={ballX} cy={ballY} r={5} fill="#FF4444" stroke="#CC0000" strokeWidth="1"/>;
  };

  const bellyTransform = bellyUp ? `rotate(${180 + Math.sin(walkPhase * Math.PI * 2) * 10}, 50, 60)` : '';

  const designs: Record<string, JSX.Element> = {
    robot: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,65) ${bellyTransform}`}>
          <line x1="50" y1="5" x2="50" y2="20" stroke={s} strokeWidth="3"/>
          <circle cx="50" cy="5" r="4" fill={p}>
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <rect x="20" y="20" width="60" height="45" rx="12" fill={p}/>
          {eyes(38,42,7,62,42,7)}
          {mouth(50,56,8)}
          <rect x="25" y="68" width="50" height="35" rx="8" fill={s}/>
          {/* Chest lights */}
          <circle cx="40" cy="80" r="3" fill="#00FF88" opacity={0.5+Math.sin(walkPhase*Math.PI*2)*0.5}/>
          <circle cx="50" cy="80" r="3" fill="#FFD700" opacity={0.5+Math.sin(walkPhase*Math.PI*2+1)*0.5}/>
          <circle cx="60" cy="80" r="3" fill="#FF4444" opacity={0.5+Math.sin(walkPhase*Math.PI*2+2)*0.5}/>
          <g transform={`rotate(${armAngle+scratchPhase},8,76)`}><rect x="4" y="72" width="18" height="8" rx="4" fill={p}/><circle cx="4" cy="76" r="4" fill={s}/></g>
          <g transform={`rotate(${-armAngle},92,76)`}><rect x="78" y="72" width="18" height="8" rx="4" fill={p}/><circle cx="96" cy="76" r="4" fill={s}/></g>
        </g>
        <g transform={`rotate(${legAngle},36,103)`}><rect x="28" y="103" width="14" height="18" rx="5" fill={p}/><rect x="26" y="118" width="18" height="6" rx="3" fill={s}/></g>
        <g transform={`rotate(${-legAngle},64,103)`}><rect x="58" y="103" width="14" height="18" rx="5" fill={p}/><rect x="56" y="118" width="18" height="6" rx="3" fill={s}/></g>
        {playBall()}
      </svg>
    ),
    cat: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,50) scale(1,${pounceSquash}) ${bellyTransform}`}>
          {/* Ears with twitch */}
          <polygon points={`20,30 ${30+earTwitch*0.3},${5-Math.abs(earTwitch)*0.5} 40,30`} fill={p}/>
          <polygon points={`60,30 ${70-earTwitch*0.3},${5-Math.abs(earTwitch)*0.5} 80,30`} fill={p}/>
          <polygon points={`24,28 ${30+earTwitch*0.2},12 36,28`} fill="#FFB6C1"/>
          <polygon points={`64,28 ${70-earTwitch*0.2},12 76,28`} fill="#FFB6C1"/>
          {/* Head */}
          <ellipse cx="50" cy={45+sniffBob} rx={32+breathe} ry={28+breathe} fill={p}/>
          {eyes(38,43,6,62,43,6)}
          <ellipse cx="50" cy="52" rx="3" ry="2" fill="#FFB6C1"/>
          {tongue(50,52)}
          {/* Whiskers with movement */}
          <line x1={15+Math.sin(walkPhase*Math.PI)*2} y1="50" x2="35" y2="52" stroke={s} strokeWidth="1.5" opacity="0.6"/>
          <line x1={15+Math.sin(walkPhase*Math.PI+0.5)*2} y1="55" x2="35" y2="55" stroke={s} strokeWidth="1.5" opacity="0.6"/>
          <line x1={12+Math.sin(walkPhase*Math.PI+1)*2} y1="53" x2="35" y2="54" stroke={s} strokeWidth="1" opacity="0.4"/>
          <line x1={85-Math.sin(walkPhase*Math.PI)*2} y1="50" x2="65" y2="52" stroke={s} strokeWidth="1.5" opacity="0.6"/>
          <line x1={85-Math.sin(walkPhase*Math.PI+0.5)*2} y1="55" x2="65" y2="55" stroke={s} strokeWidth="1.5" opacity="0.6"/>
          <line x1={88-Math.sin(walkPhase*Math.PI+1)*2} y1="53" x2="65" y2="54" stroke={s} strokeWidth="1" opacity="0.4"/>
          {mouth(50,56,6)}
          {/* Body */}
          <ellipse cx="50" cy="78" rx={22+breathe} ry={16+breathe} fill={p}/>
          {/* Tail with fluid wave */}
          <path d={`M 72 75 Q ${88+Math.sin(walkPhase*Math.PI*2)*10} ${68+Math.cos(walkPhase*Math.PI*1.5)*8} ${82+Math.sin(walkPhase*Math.PI*2.5)*6} ${55+Math.cos(walkPhase*Math.PI*2)*5}`} stroke={p} strokeWidth="6" fill="none" strokeLinecap="round"/>
          {/* Paws with subtle pad details */}
          <g transform={`rotate(${armAngle*0.5+scratchPhase},25,72)`}><ellipse cx="22" cy="75" rx="6" ry="4" fill={p}/></g>
          <g transform={`rotate(${-armAngle*0.5},75,72)`}><ellipse cx="78" cy="75" rx="6" ry="4" fill={p}/></g>
        </g>
        {/* Legs with paw pads */}
        <g transform={`rotate(${legAngle},35,94)`}>
          <ellipse cx="35" cy="100" rx="8" ry="10" fill={p}/>
          <ellipse cx="35" cy="106" rx="5" ry="3" fill={s} opacity="0.3"/>
        </g>
        <g transform={`rotate(${-legAngle},65,94)`}>
          <ellipse cx="65" cy="100" rx="8" ry="10" fill={p}/>
          <ellipse cx="65" cy="106" rx="5" ry="3" fill={s} opacity="0.3"/>
        </g>
        {playBall()}
      </svg>
    ),
    octopus: (
      <svg viewBox="0 0 100 110" width={size} height={size*1.1}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,35) ${bellyTransform}`}>
          <ellipse cx="50" cy="35" rx={30+breathe} ry={30+breathe} fill={p}/>
          {eyes(40,32,8,60,32,8)}
          {mouth(50,48,6)}
          {tongue(50,48)}
          {/* Spots */}
          <circle cx="35" cy="20" r="4" fill={s} opacity="0.2"/>
          <circle cx="55" cy="18" r="3" fill={s} opacity="0.2"/>
          <circle cx="65" cy="25" r="3.5" fill={s} opacity="0.2"/>
        </g>
        {/* Tentacles with fluid wave */}
        {[0,1,2,3,4,5].map(i => {
          const baseX = 22 + i * 12;
          const phase = walkPhase * Math.PI * 2 + i * 1.2;
          const cx = baseX + Math.sin(phase) * 8;
          const cy = 80 + Math.sin(phase + 1) * 5;
          const ex = baseX + Math.sin(phase + 0.5) * 6;
          const ey = 100 + Math.sin(phase) * 6;
          return <path key={i} d={`M ${baseX} ${58} Q ${cx} ${cy} ${ex} ${ey}`} stroke={p} strokeWidth="6" fill="none" strokeLinecap="round"/>;
        })}
        {playBall()}
      </svg>
    ),
    ghost: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,50) ${bellyTransform}`}>
          <path d={`M 20 50 Q 20 15, 50 15 Q 80 15, 80 50 L 80 90 Q ${73+Math.sin(walkPhase*Math.PI*2)*4} ${82}, 65 ${90+Math.sin(walkPhase*Math.PI*2+1)*5} Q 57 ${98+Math.sin(walkPhase*Math.PI*2+2)*4}, 50 ${90+Math.sin(walkPhase*Math.PI*2+3)*5} Q 43 ${82+Math.sin(walkPhase*Math.PI*2+4)*4}, 35 ${90+Math.sin(walkPhase*Math.PI*2+5)*5} Q 27 ${98+Math.sin(walkPhase*Math.PI*2+6)*4}, 20 90 Z`} fill={p} opacity="0.92"/>
          {eyes(38,48,8,62,48,8)}
          {mouthOpen ? <ellipse cx="50" cy="66" rx="7" ry="5" fill={s} opacity="0.6"/> : <ellipse cx="50" cy="65" rx="6" ry="4" fill={s}/>}
          <circle cx="28" cy="58" r="5" fill="#FFB6C1" opacity="0.4"/>
          <circle cx="72" cy="58" r="5" fill="#FFB6C1" opacity="0.4"/>
          <g transform={`rotate(${armAngle+scratchPhase},22,55)`}><ellipse cx="14" cy="58" rx="7" ry="5" fill={p} opacity="0.7"/></g>
          <g transform={`rotate(${-armAngle},78,55)`}><ellipse cx="86" cy="58" rx="7" ry="5" fill={p} opacity="0.7"/></g>
        </g>
        {playBall()}
      </svg>
    ),
    penguin: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,50) ${bellyTransform}`}>
          <ellipse cx="50" cy="50" rx={30+breathe} ry={35+breathe} fill="#1a1a2e"/>
          <ellipse cx="50" cy="55" rx="20" ry="25" fill="white"/>
          {eyes(40,42,6,60,42,6)}
          <polygon points="45,52 55,52 50,58" fill="#FF8C00"/>
          {tongue(50,58)}
          {/* Flippers with waddle */}
          <g transform={`rotate(${armAngle*1.5+scratchPhase},22,55)`}><ellipse cx="16" cy="60" rx="12" ry="6" fill="#1a1a2e"/></g>
          <g transform={`rotate(${-armAngle*1.5},78,55)`}><ellipse cx="84" cy="60" rx="12" ry="6" fill="#1a1a2e"/></g>
          {/* Belly highlight */}
          <ellipse cx="50" cy="62" rx="10" ry="8" fill="white" opacity="0.3"/>
        </g>
        {/* Feet with waddle */}
        <g transform={`rotate(${legAngle*1.2},40,85)`}><ellipse cx="40" cy="92" rx="12" ry="5" fill="#FF8C00"/></g>
        <g transform={`rotate(${-legAngle*1.2},60,85)`}><ellipse cx="60" cy="92" rx="12" ry="5" fill="#FF8C00"/></g>
        {playBall()}
      </svg>
    ),
    bunny: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,50) ${bellyTransform}`}>
          {/* Ears with twitch and droop */}
          <ellipse cx={40+earTwitch*0.2} cy={18+Math.abs(earTwitch)*0.3} rx="8" ry={22+Math.sin(walkPhase*Math.PI*0.5)*1.5} fill={p} transform={`rotate(${-5+earTwitch*0.5},40,35)`}/>
          <ellipse cx={60-earTwitch*0.2} cy={18+Math.abs(earTwitch)*0.3} rx="8" ry={22+Math.sin(walkPhase*Math.PI*0.5+1)*1.5} fill={p} transform={`rotate(${5-earTwitch*0.5},60,35)`}/>
          <ellipse cx={40+earTwitch*0.2} cy="18" rx="5" ry="18" fill="#FFB6C1" transform={`rotate(${-5+earTwitch*0.5},40,35)`}/>
          <ellipse cx={60-earTwitch*0.2} cy="18" rx="5" ry="18" fill="#FFB6C1" transform={`rotate(${5-earTwitch*0.5},60,35)`}/>
          {/* Head */}
          <circle cx="50" cy={50+sniffBob} r={25+breathe} fill={p}/>
          {eyes(42,46,5,58,46,5)}
          <ellipse cx="50" cy="54" rx="3" ry="2" fill="#FFB6C1"/>
          {tongue(50,55)}
          {/* Twitching nose */}
          <ellipse cx="50" cy={54+Math.sin(walkPhase*Math.PI*4)*0.8} rx={3+Math.sin(walkPhase*Math.PI*3)*0.5} ry={2+Math.sin(walkPhase*Math.PI*3)*0.3} fill="#FFB6C1"/>
          {/* Whiskers */}
          <line x1="30" y1="52" x2={18+Math.sin(walkPhase*Math.PI)*1.5} y2="50" stroke={s} strokeWidth="1" opacity="0.5"/>
          <line x1="30" y1="55" x2={18+Math.sin(walkPhase*Math.PI+1)*1.5} y2="56" stroke={s} strokeWidth="1" opacity="0.5"/>
          <line x1="70" y1="52" x2={82-Math.sin(walkPhase*Math.PI)*1.5} y2="50" stroke={s} strokeWidth="1" opacity="0.5"/>
          <line x1="70" y1="55" x2={82-Math.sin(walkPhase*Math.PI+1)*1.5} y2="56" stroke={s} strokeWidth="1" opacity="0.5"/>
          {mouth(50,58,4)}
          {/* Body */}
          <ellipse cx="50" cy="82" rx={18+breathe} ry={16+breathe} fill={p}/>
          {/* Fluffy tail */}
          <circle cx={68+Math.sin(walkPhase*Math.PI*2)*2} cy={80+Math.cos(walkPhase*Math.PI*2)*2} r="7" fill="white"/>
          {/* Arms */}
          <g transform={`rotate(${armAngle*0.8+scratchPhase},28,72)`}><ellipse cx="25" cy="76" rx="6" ry="4" fill={p}/></g>
          <g transform={`rotate(${-armAngle*0.8},72,72)`}><ellipse cx="75" cy="76" rx="6" ry="4" fill={p}/></g>
        </g>
        {/* Feet with hop */}
        <g transform={`rotate(${legAngle},40,98)`}><ellipse cx="38" cy="104" rx="9" ry="11" fill={p}/><ellipse cx="38" cy="110" rx="5" ry="3" fill={s} opacity="0.2"/></g>
        <g transform={`rotate(${-legAngle},60,98)`}><ellipse cx="62" cy="104" rx="9" ry="11" fill={p}/><ellipse cx="62" cy="110" rx="5" ry="3" fill={s} opacity="0.2"/></g>
        {playBall()}
      </svg>
    ),
    fox: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,48) ${bellyTransform}`}>
          {/* Ears with twitch */}
          <polygon points={`18,35 ${32+earTwitch*0.3},${5-Math.abs(earTwitch)*0.4} 42,35`} fill={p}/>
          <polygon points={`58,35 ${68-earTwitch*0.3},${5-Math.abs(earTwitch)*0.4} 82,35`} fill={p}/>
          <polygon points="22,33 32,12 38,33" fill="white"/>
          <polygon points="62,33 68,12 78,33" fill="white"/>
          <ellipse cx="50" cy={48+sniffBob} rx={30+breathe} ry={25+breathe} fill={p}/>
          <ellipse cx="50" cy="52" rx="15" ry="12" fill="white"/>
          {eyes(40,44,5,60,44,5)}
          <circle cx="50" cy="50" r="3" fill="#333"/>
          {tongue(50,54)}
          {mouth(50,55,5)}
          <ellipse cx="50" cy="80" rx={18+breathe} ry={14+breathe} fill={p}/>
          {/* Bushy tail with wave */}
          <path d={`M 68 78 Q ${88+Math.sin(walkPhase*Math.PI*2)*8} ${68+Math.cos(walkPhase*Math.PI*1.5)*8} ${82+Math.sin(walkPhase*Math.PI*2.5)*6} ${55+Math.cos(walkPhase*Math.PI*2)*6}`} stroke={p} strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d={`M ${82+Math.sin(walkPhase*Math.PI*2.5)*6} ${55+Math.cos(walkPhase*Math.PI*2)*6} L ${85+Math.sin(walkPhase*Math.PI*2.5)*6} ${52+Math.cos(walkPhase*Math.PI*2)*6}`} stroke="white" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <g transform={`rotate(${armAngle+scratchPhase},24,68)`}><ellipse cx="20" cy="72" rx="7" ry="4" fill={p}/></g>
          <g transform={`rotate(${-armAngle},76,68)`}><ellipse cx="80" cy="72" rx="7" ry="4" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},38,94)`}><ellipse cx="38" cy="100" rx="7" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,94)`}><ellipse cx="62" cy="100" rx="7" ry="10" fill={p}/></g>
        {playBall()}
      </svg>
    ),
    panda: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,42) ${bellyTransform}`}>
          <circle cx="50" cy="42" r={30+breathe} fill="white"/>
          {/* Ear patches with twitch */}
          <circle cx={32+earTwitch*0.2} cy={20+Math.abs(earTwitch)*0.2} r="10" fill="#1a1a2e"/>
          <circle cx={68-earTwitch*0.2} cy={20+Math.abs(earTwitch)*0.2} r="10" fill="#1a1a2e"/>
          {/* Eye patches */}
          <circle cx="36" cy="35" r="10" fill="#1a1a2e"/>
          <circle cx="64" cy="35" r="10" fill="#1a1a2e"/>
          {eyes(36,35,6,64,35,6)}
          <ellipse cx="50" cy="48" rx="4" ry="3" fill="#1a1a2e"/>
          {tongue(50,50)}
          {mouth(50,52,5)}
          {/* Cheek blush */}
          <circle cx="30" cy="45" r="4" fill="#FFB6C1" opacity="0.3"/>
          <circle cx="70" cy="45" r="4" fill="#FFB6C1" opacity="0.3"/>
          <ellipse cx="50" cy="80" rx={22+breathe} ry={18+breathe} fill="white"/>
          <ellipse cx="50" cy="80" rx="14" ry="12" fill="#1a1a2e" opacity="0.1"/>
          <g transform={`rotate(${armAngle+scratchPhase},24,65)`}><ellipse cx="18" cy="68" rx="11" ry="7" fill="#1a1a2e"/></g>
          <g transform={`rotate(${-armAngle},76,65)`}><ellipse cx="82" cy="68" rx="11" ry="7" fill="#1a1a2e"/></g>
        </g>
        <g transform={`rotate(${legAngle},38,95)`}><ellipse cx="38" cy="100" rx="9" ry="8" fill="#1a1a2e"/></g>
        <g transform={`rotate(${-legAngle},62,95)`}><ellipse cx="62" cy="100" rx="9" ry="8" fill="#1a1a2e"/></g>
        {playBall()}
      </svg>
    ),
    alien: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,38) ${bellyTransform}`}>
          <ellipse cx="50" cy="38" rx={32+breathe} ry={28+breathe} fill={p}/>
          <ellipse cx="36" cy="36" rx="10" ry="8" fill="white"/>
          <ellipse cx="64" cy="36" rx="10" ry="8" fill="white"/>
          {eyes(36,36,6,64,36,6)}
          {mouth(50,52,5)}
          {tongue(50,52)}
          {/* Antennae with bob */}
          <line x1="40" y1="10" x2={35+Math.sin(walkPhase*Math.PI*2)*3} y2="-2" stroke={p} strokeWidth="2"/>
          <circle cx={35+Math.sin(walkPhase*Math.PI*2)*3} cy="-4" r="3" fill={s}>
            <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
          </circle>
          <line x1="60" y1="10" x2={65+Math.sin(walkPhase*Math.PI*2+1)*3} y2="-2" stroke={p} strokeWidth="2"/>
          <circle cx={65+Math.sin(walkPhase*Math.PI*2+1)*3} cy="-4" r="3" fill={s}>
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1s" repeatCount="indefinite"/>
          </circle>
          <ellipse cx="50" cy="78" rx={16+breathe} ry={18+breathe} fill={p}/>
          <g transform={`rotate(${armAngle+scratchPhase},24,62)`}><rect x="14" y="60" width="18" height="5" rx="2.5" fill={p}/></g>
          <g transform={`rotate(${-armAngle},76,62)`}><rect x="68" y="60" width="18" height="5" rx="2.5" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},40,96)`}><rect x="36" y="96" width="8" height="16" rx="4" fill={p}/></g>
        <g transform={`rotate(${-legAngle},60,96)`}><rect x="56" y="96" width="8" height="16" rx="4" fill={p}/></g>
        {playBall()}
      </svg>
    ),
    bear: (
      <svg viewBox="0 0 100 120" width={size} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,42) ${bellyTransform}`}>
          {/* Ears with twitch */}
          <circle cx={30+earTwitch*0.15} cy={22+Math.abs(earTwitch)*0.2} r="12" fill={p}/>
          <circle cx={70-earTwitch*0.15} cy={22+Math.abs(earTwitch)*0.2} r="12" fill={p}/>
          <circle cx={30+earTwitch*0.15} cy={22+Math.abs(earTwitch)*0.2} r="7" fill={s} opacity="0.5"/>
          <circle cx={70-earTwitch*0.15} cy={22+Math.abs(earTwitch)*0.2} r="7" fill={s} opacity="0.5"/>
          <circle cx="50" cy="42" r={28+breathe} fill={p}/>
          <ellipse cx="50" cy="48" rx="16" ry="12" fill={s} opacity="0.25"/>
          {eyes(40,38,5,60,38,5)}
          <ellipse cx="50" cy={47+sniffBob} rx="4" ry="3" fill="#333"/>
          {tongue(50,50)}
          {mouth(50,52,5)}
          <ellipse cx="50" cy="82" rx={20+breathe} ry={16+breathe} fill={p}/>
          <ellipse cx="50" cy="82" rx="12" ry="10" fill={s} opacity="0.15"/>
          <g transform={`rotate(${armAngle+scratchPhase},24,60)`}><ellipse cx="18" cy="64" rx="11" ry="7" fill={p}/></g>
          <g transform={`rotate(${-armAngle},76,60)`}><ellipse cx="82" cy="64" rx="11" ry="7" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},38,96)`}><ellipse cx="38" cy="102" rx="9" ry="8" fill={p}/><ellipse cx="38" cy="106" rx="5" ry="3" fill={s} opacity="0.2"/></g>
        <g transform={`rotate(${-legAngle},62,96)`}><ellipse cx="62" cy="102" rx="9" ry="8" fill={p}/><ellipse cx="62" cy="106" rx="5" ry="3" fill={s} opacity="0.2"/></g>
        {playBall()}
      </svg>
    ),
    dragon: (
      <svg viewBox="0 0 110 120" width={size*1.1} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,42) ${bellyTransform}`}>
          {/* Horns */}
          <polygon points={`25,25 ${15+earTwitch*0.3},5 35,20`} fill={s}/>
          <polygon points={`75,25 ${85-earTwitch*0.3},5 65,20`} fill={s}/>
          <ellipse cx="50" cy="42" rx={28+breathe} ry={25+breathe} fill={p}/>
          {eyes(40,38,6,60,38,6)}
          {/* Nostrils with smoke puffs */}
          <circle cx="44" cy="50" r="2" fill={s} opacity="0.5"/>
          <circle cx="56" cy="50" r="2" fill={s} opacity="0.5"/>
          {reactionAnim === 'howl' && <>
            <circle cx={40+Math.random()*3} cy={42-Math.sin(walkPhase*Math.PI*3)*5} r="2" fill="#888" opacity={0.3+Math.sin(walkPhase*Math.PI*4)*0.2}/>
            <circle cx={60+Math.random()*3} cy={42-Math.sin(walkPhase*Math.PI*3+1)*5} r="2" fill="#888" opacity={0.3+Math.sin(walkPhase*Math.PI*4+1)*0.2}/>
          </>}
          {tongue(50,52)}
          {mouth(50,52,6)}
          {/* Spines */}
          <polygon points="35,20 40,8 45,20" fill={p}/>
          <polygon points="45,18 50,4 55,18" fill={p}/>
          <polygon points="55,20 60,8 65,20" fill={p}/>
          <ellipse cx="50" cy="78" rx={18+breathe} ry={14+breathe} fill={p}/>
          <ellipse cx="50" cy="78" rx="12" ry="10" fill={s} opacity="0.2"/>
          {/* Wings with flap */}
          <g transform={`rotate(${armAngle*1.5},22,55)`}>
            <path d="M 22 55 L 5 40 L 10 50 L 0 42 L 8 55" fill={p} opacity="0.7"/>
          </g>
          <g transform={`rotate(${-armAngle*1.5},78,55)`}>
            <path d="M 78 55 L 95 40 L 90 50 L 100 42 L 92 55" fill={p} opacity="0.7"/>
          </g>
          {/* Tail with flame tip */}
          <path d={`M 68 76 Q ${88+Math.sin(walkPhase*Math.PI*2)*10} ${70+Math.cos(walkPhase*Math.PI*1.5)*6} ${95+Math.sin(walkPhase*Math.PI*2.5)*5} ${55+Math.cos(walkPhase*Math.PI*2)*5}`} stroke={p} strokeWidth="7" fill="none" strokeLinecap="round"/>
          <polygon points={`${95+Math.sin(walkPhase*Math.PI*2.5)*5},${55+Math.cos(walkPhase*Math.PI*2)*5} ${100+Math.sin(walkPhase*Math.PI*2.5)*5},${50+Math.cos(walkPhase*Math.PI*2)*5} ${90+Math.sin(walkPhase*Math.PI*2.5)*5},${48+Math.cos(walkPhase*Math.PI*2)*5}`} fill={s}/>
        </g>
        <g transform={`rotate(${legAngle},38,92)`}><ellipse cx="38" cy="98" rx="8" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,92)`}><ellipse cx="62" cy="98" rx="8" ry="10" fill={p}/></g>
        {playBall()}
      </svg>
    ),
    unicorn: (
      <svg viewBox="0 0 100 130" width={size} height={size*1.3}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,45) ${bellyTransform}`}>
          {/* Horn with sparkle */}
          <polygon points="50,2 45,28 55,28" fill="#FFD700"/>
          <line x1="47" y1="10" x2="53" y2="10" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          <line x1="46" y1="16" x2="54" y2="16" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          <line x1="47" y1="22" x2="53" y2="22" stroke="white" strokeWidth="1.5" opacity="0.6"/>
          <ellipse cx="50" cy="45" rx={28+breathe} ry={24+breathe} fill={p}/>
          {/* Ears */}
          <polygon points={`22,32 ${28+earTwitch*0.3},18 34,32`} fill={p}/>
          <polygon points={`66,32 ${72-earTwitch*0.3},18 78,32`} fill={p}/>
          {eyes(40,42,5,58,42,5)}
          {mouth(50,52,5)}
          {tongue(50,53)}
          {/* Mane with flow */}
          <path d={`M 22 38 Q ${8+Math.sin(walkPhase*Math.PI*2)*4} ${32+Math.sin(walkPhase*Math.PI*1.5)*3} 12 48`} stroke="#FF69B4" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d={`M 22 42 Q ${6+Math.sin(walkPhase*Math.PI*2+0.5)*4} ${38+Math.sin(walkPhase*Math.PI*1.5+0.5)*3} 10 54`} stroke="#87CEEB" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d={`M 22 46 Q ${8+Math.sin(walkPhase*Math.PI*2+1)*4} ${44+Math.sin(walkPhase*Math.PI*1.5+1)*3} 14 58`} stroke="#DDA0DD" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
          <circle cx="38" cy="50" r="4" fill="#FFB6C1" opacity="0.35"/>
          <circle cx="62" cy="50" r="4" fill="#FFB6C1" opacity="0.35"/>
          <ellipse cx="50" cy="82" rx={20+breathe} ry={16+breathe} fill={p}/>
          {/* Tail with rainbow flow */}
          <path d={`M 70 82 Q ${88+Math.sin(walkPhase*Math.PI*2)*8} ${78} ${84+Math.sin(walkPhase*Math.PI*2.5)*5} ${68}`} stroke="#FF69B4" strokeWidth="5" fill="none" strokeLinecap="round"/>
          <path d={`M 70 84 Q ${90+Math.sin(walkPhase*Math.PI*2+0.3)*8} ${80} ${86+Math.sin(walkPhase*Math.PI*2.5+0.3)*5} ${70}`} stroke="#87CEEB" strokeWidth="4" fill="none" strokeLinecap="round"/>
          <path d={`M 70 86 Q ${92+Math.sin(walkPhase*Math.PI*2+0.6)*8} ${82} ${88+Math.sin(walkPhase*Math.PI*2.5+0.6)*5} ${72}`} stroke="#DDA0DD" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <g transform={`rotate(${armAngle+scratchPhase},22,62)`}><ellipse cx="18" cy="66" rx="8" ry="5" fill={p}/></g>
          <g transform={`rotate(${-armAngle},78,62)`}><ellipse cx="82" cy="66" rx="8" ry="5" fill={p}/></g>
        </g>
        <g transform={`rotate(${legAngle},38,98)`}><ellipse cx="38" cy="104" rx="7" ry="10" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,98)`}><ellipse cx="62" cy="104" rx="7" ry="10" fill={p}/></g>
        {playBall()}
      </svg>
    ),
    dino: (
      <svg viewBox="0 0 110 120" width={size*1.1} height={size*1.2}>
        <g transform={`translate(0,${-bodyBob}) rotate(${headTilt},50,42) ${bellyTransform}`}>
          {/* Spines along back */}
          <polygon points="38,18 42,6 46,18" fill={s}/>
          <polygon points="46,15 50,3 54,15" fill={s}/>
          <polygon points="54,18 58,6 62,18" fill={s}/>
          <ellipse cx="50" cy="42" rx={28+breathe} ry={26+breathe} fill={p}/>
          {eyes(40,38,6,60,38,6)}
          {tongue(50,52)}
          {mouthOpen ? <path d="M 38 52 Q 50 62 62 52" stroke={s} strokeWidth="2" fill={s} opacity="0.4"/> : mouth(50,52,8)}
          {/* Cheeks */}
          <circle cx="30" cy="48" r="4" fill="#FFB6C1" opacity="0.3"/>
          <circle cx="70" cy="48" r="4" fill="#FFB6C1" opacity="0.3"/>
          <ellipse cx="50" cy="82" rx={22+breathe} ry={16+breathe} fill={p}/>
          <ellipse cx="50" cy="82" rx="14" ry="10" fill={s} opacity="0.15"/>
          {/* Tiny arms with wiggle */}
          <g transform={`rotate(${armAngle*1.2+scratchPhase},24,58)`}><ellipse cx="18" cy="62" rx="12" ry="5" fill={p}/><circle cx="10" cy="62" r="3" fill={s} opacity="0.3"/></g>
          <g transform={`rotate(${-armAngle*1.2},76,58)`}><ellipse cx="82" cy="62" rx="12" ry="5" fill={p}/><circle cx="90" cy="62" r="3" fill={s} opacity="0.3"/></g>
          {/* Tail with spines */}
          <path d={`M 72 82 Q ${90+Math.sin(walkPhase*Math.PI*2)*6} ${88+Math.cos(walkPhase*Math.PI*1.5)*4} ${95+Math.sin(walkPhase*Math.PI*2.5)*4} ${95+Math.cos(walkPhase*Math.PI*2)*3}`} stroke={p} strokeWidth="10" fill="none" strokeLinecap="round"/>
          <polygon points={`${85+Math.sin(walkPhase*Math.PI*2)*4},${82} ${88+Math.sin(walkPhase*Math.PI*2)*4},${76} ${91+Math.sin(walkPhase*Math.PI*2)*4},${82}`} fill={s} opacity="0.6"/>
        </g>
        <g transform={`rotate(${legAngle},38,96)`}><rect x="32" y="96" width="12" height="18" rx="6" fill={p}/></g>
        <g transform={`rotate(${-legAngle},62,96)`}><rect x="56" y="96" width="12" height="18" rx="6" fill={p}/></g>
        {playBall()}
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
  const pauseTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const spontaneousRef = useRef<ReturnType<typeof setInterval>>();
  const emojiIdRef = useRef(0);
  const reactionTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
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
      
      walkPhaseRef.current = (walkPhaseRef.current + 0.025) % 1;
      if (frameCount % 2 === 0) setWalkPhase(walkPhaseRef.current);

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

  // Spontaneous reactions with natural behavior variety
  useEffect(() => {
    if (!settings?.enabled || !settings.click_reactions) return;
    const interval = (settings.spontaneous_interval || 30) * 1000;
    spontaneousRef.current = setInterval(() => {
      const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
      setReaction(r);
      const duration = ['lick','groom','playBall','fetch','dig','howl'].includes(r) ? 2500 : 1500;
      setTimeout(() => setReaction(null), duration);
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
    const duration = ['lick','groom','playBall','fetch','dig','howl'].includes(r) ? 2500 : 1500;
    reactionTimeoutRef.current = setTimeout(() => setReaction(null), duration);
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
        @keyframes mascot-react-dance { 0%{transform:rotate(0) translateY(0)} 20%{transform:rotate(-12deg) translateY(-5px)} 40%{transform:rotate(12deg) translateY(-8px)} 60%{transform:rotate(-8deg) translateY(-3px)} 80%{transform:rotate(8deg) translateY(-6px)} 100%{transform:rotate(0) translateY(0)} }
        @keyframes mascot-react-nod { 0%,100%{transform:translateY(0)} 25%{transform:translateY(6px)} 50%{transform:translateY(0)} 75%{transform:translateY(6px)} }
        @keyframes mascot-react-heart { 0%{transform:scale(1)} 15%{transform:scale(1.2)} 30%{transform:scale(1)} 45%{transform:scale(1.15)} 60%{transform:scale(1)} 100%{transform:scale(1)} }
        @keyframes mascot-react-backflip { 0%{transform:rotate(0) translateY(0)} 50%{transform:rotate(-180deg) translateY(-30px)} 100%{transform:rotate(-360deg) translateY(0)} }
        @keyframes mascot-react-peek { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(20px) scale(0.8)} 50%{transform:translateY(20px) scale(0.8)} 70%{transform:translateY(0) scale(1.05)} }
        @keyframes mascot-react-shake { 0%,100%{transform:rotate(0)} 10%{transform:rotate(-12deg)} 20%{transform:rotate(12deg)} 30%{transform:rotate(-10deg)} 40%{transform:rotate(10deg)} 50%{transform:rotate(-6deg)} 60%{transform:rotate(6deg)} }
        @keyframes mascot-react-bow { 0%,100%{transform:rotate(0)} 40%{transform:rotate(20deg)} 60%{transform:rotate(20deg)} }
        @keyframes mascot-react-clap { 0%,100%{transform:scaleX(1)} 15%{transform:scaleX(0.85)} 30%{transform:scaleX(1)} 45%{transform:scaleX(0.85)} 60%{transform:scaleX(1)} 75%{transform:scaleX(0.85)} }
        @keyframes mascot-react-bounce { 0%,100%{transform:translateY(0)} 20%{transform:translateY(-15px)} 40%{transform:translateY(0)} 60%{transform:translateY(-10px)} 80%{transform:translateY(0)} }
        @keyframes mascot-react-roll { 0%{transform:rotate(0) translateX(0)} 50%{transform:rotate(360deg) translateX(30px)} 100%{transform:rotate(720deg) translateX(0)} }
        @keyframes mascot-react-dizzy { 0%{transform:rotate(0)} 25%{transform:rotate(15deg) translateX(5px)} 50%{transform:rotate(-15deg) translateX(-5px)} 75%{transform:rotate(10deg) translateX(3px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-stretch { 0%,100%{transform:scaleY(1)} 40%{transform:scaleY(1.3) scaleX(0.82)} 60%{transform:scaleY(1.3) scaleX(0.82)} }
        @keyframes mascot-react-yawn { 0%,100%{transform:scale(1)} 30%{transform:scale(1.08) translateY(-3px)} 50%{transform:scale(1.12) translateY(-5px)} 70%{transform:scale(1.08) translateY(-3px)} }
        @keyframes mascot-react-sneeze { 0%{transform:translateY(0) scale(1)} 40%{transform:translateY(-5px) scale(1.05)} 50%{transform:translateY(8px) scale(0.9)} 60%{transform:translateY(0) scale(1.15)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-react-laugh { 0%,100%{transform:translateY(0) rotate(0)} 10%{transform:translateY(-4px) rotate(-4deg)} 20%{transform:translateY(0) rotate(4deg)} 30%{transform:translateY(-4px) rotate(-4deg)} 40%{transform:translateY(0) rotate(4deg)} 50%{transform:translateY(-3px) rotate(-3deg)} }
        @keyframes mascot-react-blush { 0%,100%{transform:scale(1)} 30%{transform:scale(1.05)} 50%{transform:scale(0.95) rotate(5deg)} 70%{transform:scale(1.05) rotate(-5deg)} }
        @keyframes mascot-react-wink { 0%,100%{transform:scaleY(1)} 40%{transform:scaleY(0.9)} 50%{transform:scaleY(1.05)} }
        @keyframes mascot-react-salute { 0%{transform:rotate(0)} 20%{transform:rotate(-5deg) translateY(-3px)} 80%{transform:rotate(-5deg) translateY(-3px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-celebrate { 0%{transform:scale(1) rotate(0)} 20%{transform:scale(1.15) rotate(5deg)} 40%{transform:scale(1.1) rotate(-5deg)} 60%{transform:scale(1.15) rotate(5deg) translateY(-10px)} 80%{transform:scale(1.1) rotate(-3deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes mascot-react-moonwalk { 0%{transform:translateX(0) scaleX(-1)} 50%{transform:translateX(-30px) scaleX(-1)} 100%{transform:translateX(0) scaleX(-1)} }
        @keyframes mascot-react-tiptoe { 0%,100%{transform:translateY(0) scaleY(1)} 50%{transform:translateY(-10px) scaleY(1.05)} }
        @keyframes mascot-react-faceplant { 0%{transform:rotate(0)} 50%{transform:rotate(90deg) translateY(10px)} 80%{transform:rotate(90deg) translateY(10px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-hiccup { 0%,100%{transform:translateY(0) scale(1)} 15%{transform:translateY(-8px) scale(1.08)} 30%{transform:translateY(0) scale(1)} 50%{transform:translateY(-6px) scale(1.06)} 65%{transform:translateY(0) scale(1)} }
        /* New natural reaction animations */
        @keyframes mascot-react-lick { 0%,100%{transform:rotate(0) translateY(0)} 20%{transform:rotate(5deg) translateY(-2px)} 40%{transform:rotate(-3deg)} 60%{transform:rotate(4deg) translateY(-1px)} 80%{transform:rotate(-2deg)} }
        @keyframes mascot-react-earTwitch { 0%,100%{transform:scale(1)} 20%{transform:scale(1.02) translateY(-1px)} 40%{transform:scale(0.99)} 60%{transform:scale(1.01) translateY(-1px)} }
        @keyframes mascot-react-headTilt { 0%,100%{transform:rotate(0)} 30%{transform:rotate(-12deg)} 70%{transform:rotate(-12deg)} }
        @keyframes mascot-react-sniff { 0%,100%{transform:translateY(0)} 15%{transform:translateY(3px)} 30%{transform:translateY(0)} 45%{transform:translateY(3px)} 60%{transform:translateY(0)} 75%{transform:translateY(2px)} }
        @keyframes mascot-react-scratch { 0%,100%{transform:rotate(0)} 10%{transform:rotate(-4deg)} 20%{transform:rotate(2deg)} 30%{transform:rotate(-4deg)} 40%{transform:rotate(2deg)} 50%{transform:rotate(-3deg)} 60%{transform:rotate(1deg)} }
        @keyframes mascot-react-playBall { 0%{transform:translateY(0) scale(1)} 25%{transform:translateY(-12px) scale(1.05)} 50%{transform:translateY(0) scale(0.95)} 75%{transform:translateY(-8px) scale(1.03)} 100%{transform:translateY(0) scale(1)} }
        @keyframes mascot-react-chase { 0%{transform:translateX(0)} 25%{transform:translateX(15px) scaleX(1)} 50%{transform:translateX(0)} 75%{transform:translateX(-15px) scaleX(-1)} 100%{transform:translateX(0) scaleX(1)} }
        @keyframes mascot-react-purr { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        @keyframes mascot-react-pounce { 0%{transform:scaleY(1) translateY(0)} 20%{transform:scaleY(0.8) translateY(5px)} 40%{transform:scaleY(1.2) translateY(-20px) translateX(15px)} 60%{transform:scaleY(0.9) translateY(0) translateX(15px)} 100%{transform:scaleY(1) translateY(0) translateX(0)} }
        @keyframes mascot-react-tailWag { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-5deg)} 40%{transform:rotate(5deg)} 60%{transform:rotate(-4deg)} 80%{transform:rotate(4deg)} }
        @keyframes mascot-react-belly { 0%{transform:rotate(0)} 30%{transform:rotate(180deg) translateY(-5px)} 70%{transform:rotate(180deg) translateY(-5px)} 100%{transform:rotate(360deg)} }
        @keyframes mascot-react-nuzzle { 0%,100%{transform:translateX(0) rotate(0)} 25%{transform:translateX(5px) rotate(5deg)} 50%{transform:translateX(-5px) rotate(-5deg)} 75%{transform:translateX(5px) rotate(3deg)} }
        @keyframes mascot-react-howl { 0%,100%{transform:translateY(0) scale(1)} 30%{transform:translateY(-8px) scale(1.08)} 50%{transform:translateY(-12px) scale(1.1)} 70%{transform:translateY(-8px) scale(1.06)} }
        @keyframes mascot-react-dig { 0%,100%{transform:rotate(0) translateY(0)} 15%{transform:rotate(5deg) translateY(3px)} 30%{transform:rotate(-5deg) translateY(0)} 45%{transform:rotate(5deg) translateY(3px)} 60%{transform:rotate(-4deg) translateY(0)} 75%{transform:rotate(4deg) translateY(2px)} }
        @keyframes mascot-react-fetch { 0%{transform:translateX(0) translateY(0)} 30%{transform:translateX(20px) translateY(-15px)} 60%{transform:translateX(20px) translateY(0)} 100%{transform:translateX(0) translateY(0)} }
        @keyframes mascot-react-blink { 0%,40%,100%{transform:scaleY(1)} 45%{transform:scaleY(0.1)} 50%{transform:scaleY(1)} }
        @keyframes mascot-react-curious { 0%,100%{transform:rotate(0) scale(1)} 30%{transform:rotate(-8deg) scale(1.05)} 70%{transform:rotate(-8deg) scale(1.05)} }
        @keyframes mascot-react-startle { 0%{transform:scale(1) translateY(0)} 15%{transform:scale(1.2) translateY(-15px)} 30%{transform:scale(0.95) translateY(0)} 50%{transform:scale(1.05) translateY(-5px)} 100%{transform:scale(1) translateY(0)} }
        @keyframes mascot-react-groom { 0%,100%{transform:rotate(0)} 20%{transform:rotate(8deg)} 40%{transform:rotate(5deg)} 60%{transform:rotate(8deg)} 80%{transform:rotate(5deg)} }
        @keyframes mascot-react-rollOver { 0%{transform:rotate(0)} 25%{transform:rotate(90deg)} 50%{transform:rotate(180deg) translateY(-8px)} 75%{transform:rotate(270deg)} 100%{transform:rotate(360deg)} }
        /* 50 new natural reaction keyframes */
        @keyframes mascot-react-washFace { 0%,100%{transform:rotate(0)} 15%{transform:rotate(6deg) translateY(-2px)} 30%{transform:rotate(-4deg)} 45%{transform:rotate(5deg) translateY(-1px)} 60%{transform:rotate(-3deg)} 75%{transform:rotate(4deg)} }
        @keyframes mascot-react-kneadPaws { 0%,100%{transform:translateY(0)} 15%{transform:translateY(2px) scaleY(0.97)} 30%{transform:translateY(0)} 45%{transform:translateY(2px) scaleY(0.97)} 60%{transform:translateY(0)} 75%{transform:translateY(2px) scaleY(0.97)} }
        @keyframes mascot-react-archBack { 0%,100%{transform:scaleY(1) scaleX(1)} 40%{transform:scaleY(1.15) scaleX(0.9) translateY(-6px)} 60%{transform:scaleY(1.15) scaleX(0.9) translateY(-6px)} }
        @keyframes mascot-react-chaseTail { 0%{transform:rotate(0)} 100%{transform:rotate(720deg)} }
        @keyframes mascot-react-batAtToy { 0%,100%{transform:translateX(0) rotate(0)} 20%{transform:translateX(8px) rotate(5deg)} 40%{transform:translateX(-5px) rotate(-8deg)} 60%{transform:translateX(10px) rotate(6deg)} 80%{transform:translateX(-3px) rotate(-3deg)} }
        @keyframes mascot-react-boxPush { 0%,100%{transform:translateX(0)} 30%{transform:translateX(12px) scaleX(0.95)} 60%{transform:translateX(12px) scaleX(0.95)} }
        @keyframes mascot-react-sunbathe { 0%,100%{transform:scaleY(1) rotate(0)} 30%{transform:scaleY(0.85) rotate(5deg)} 70%{transform:scaleY(0.85) rotate(5deg)} }
        @keyframes mascot-react-purrVibrate { 0%,100%{transform:translateX(0)} 10%{transform:translateX(1px)} 20%{transform:translateX(-1px)} 30%{transform:translateX(1px)} 40%{transform:translateX(-1px)} 50%{transform:translateX(1px)} 60%{transform:translateX(-1px)} 70%{transform:translateX(1px)} 80%{transform:translateX(-1px)} }
        @keyframes mascot-react-hiss { 0%{transform:scale(1)} 20%{transform:scale(1.2) scaleX(1.1)} 80%{transform:scale(1.2) scaleX(1.1)} 100%{transform:scale(1)} }
        @keyframes mascot-react-slowBlink { 0%,60%,100%{transform:scaleY(1)} 70%{transform:scaleY(0.05)} 80%{transform:scaleY(1)} }
        @keyframes mascot-react-shakeFur { 0%,100%{transform:rotate(0) scaleX(1)} 10%{transform:rotate(-8deg) scaleX(1.05)} 20%{transform:rotate(8deg) scaleX(1.05)} 30%{transform:rotate(-6deg)} 40%{transform:rotate(6deg)} 50%{transform:rotate(-4deg)} 60%{transform:rotate(4deg)} }
        @keyframes mascot-react-sitPretty { 0%,100%{transform:translateY(0)} 30%{transform:translateY(-10px) scaleY(1.08)} 70%{transform:translateY(-10px) scaleY(1.08)} }
        @keyframes mascot-react-rollOnBack { 0%{transform:rotate(0)} 30%{transform:rotate(150deg) translateY(-5px)} 70%{transform:rotate(150deg) translateY(-5px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-sniffGround { 0%,100%{transform:translateY(0) rotate(0)} 30%{transform:translateY(8px) rotate(10deg)} 50%{transform:translateY(10px) rotate(12deg)} 70%{transform:translateY(8px) rotate(10deg)} }
        @keyframes mascot-react-pointNose { 0%,100%{transform:rotate(0) scaleX(1)} 30%{transform:rotate(-3deg) scaleX(1.05)} 70%{transform:rotate(-3deg) scaleX(1.05)} }
        @keyframes mascot-react-tipTap { 0%,100%{transform:translateY(0)} 10%{transform:translateY(-3px)} 20%{transform:translateY(0)} 30%{transform:translateY(-3px)} 40%{transform:translateY(0)} 50%{transform:translateY(-3px)} 60%{transform:translateY(0)} }
        @keyframes mascot-react-zoomies { 0%{transform:translateX(0) scaleX(1)} 20%{transform:translateX(25px) scaleX(1)} 30%{transform:translateX(25px) scaleX(-1)} 50%{transform:translateX(-25px) scaleX(-1)} 60%{transform:translateX(-25px) scaleX(1)} 80%{transform:translateX(15px) scaleX(1)} 100%{transform:translateX(0) scaleX(1)} }
        @keyframes mascot-react-headShake { 0%,100%{transform:rotate(0)} 15%{transform:rotate(-10deg)} 30%{transform:rotate(10deg)} 45%{transform:rotate(-8deg)} 60%{transform:rotate(8deg)} 75%{transform:rotate(-4deg)} }
        @keyframes mascot-react-pawGive { 0%,100%{transform:rotate(0) translateY(0)} 30%{transform:rotate(-8deg) translateY(-4px)} 50%{transform:rotate(-5deg) translateY(-2px)} 70%{transform:rotate(-8deg) translateY(-4px)} }
        @keyframes mascot-react-playDead { 0%{transform:rotate(0)} 30%{transform:rotate(90deg) translateX(10px)} 80%{transform:rotate(90deg) translateX(10px)} 100%{transform:rotate(0)} }
        @keyframes mascot-react-waddle { 0%,100%{transform:rotate(0) translateY(0)} 25%{transform:rotate(-8deg) translateY(-3px)} 50%{transform:rotate(0) translateY(0)} 75%{transform:rotate(8deg) translateY(-3px)} }
        @keyframes mascot-react-slideBelly { 0%{transform:scaleY(1) translateX(0)} 30%{transform:scaleY(0.7) translateX(0)} 80%{transform:scaleY(0.7) translateX(30px)} 100%{transform:scaleY(1) translateX(0)} }
        @keyframes mascot-react-fishCatch { 0%{transform:translateY(0)} 20%{transform:translateY(-15px)} 40%{transform:translateY(0) rotate(5deg)} 60%{transform:translateY(-5px) rotate(-3deg)} 100%{transform:translateY(0) rotate(0)} }
        @keyframes mascot-react-huddle { 0%,100%{transform:scaleX(1) scaleY(1)} 40%{transform:scaleX(0.85) scaleY(0.9)} 60%{transform:scaleX(0.85) scaleY(0.9)} }
        @keyframes mascot-react-flipperClap { 0%,100%{transform:scaleX(1)} 20%{transform:scaleX(0.8)} 30%{transform:scaleX(1.05)} 50%{transform:scaleX(0.8)} 60%{transform:scaleX(1.05)} 80%{transform:scaleX(0.8)} }
        @keyframes mascot-react-glitch { 0%{transform:translate(0)} 10%{transform:translate(-3px,2px) skewX(5deg)} 20%{transform:translate(3px,-2px) skewX(-3deg)} 30%{transform:translate(0)} 40%{transform:translate(2px,3px) skewY(2deg)} 50%{transform:translate(-2px,-1px)} 60%{transform:translate(0)} 100%{transform:translate(0)} }
        @keyframes mascot-react-scanMode { 0%,100%{opacity:1} 25%{opacity:0.6} 50%{opacity:1} 75%{opacity:0.7} }
        @keyframes mascot-react-reboot { 0%{transform:scale(1) rotate(0)} 30%{transform:scale(0) rotate(180deg)} 60%{transform:scale(0) rotate(180deg)} 100%{transform:scale(1) rotate(360deg)} }
        @keyframes mascot-react-laserEyes { 0%,100%{transform:scale(1)} 30%{transform:scale(1.1)} 50%{transform:scale(1.15) translateY(-3px)} 70%{transform:scale(1.1)} }
        @keyframes mascot-react-systemUpdate { 0%{transform:translateY(0)} 50%{transform:translateY(-2px)} 51%{transform:translateY(0)} 100%{transform:translateY(0)} }
        @keyframes mascot-react-phase { 0%,100%{opacity:1} 30%{opacity:0.3} 50%{opacity:0.1} 70%{opacity:0.3} }
        @keyframes mascot-react-spook { 0%{transform:scale(1) translateY(0)} 30%{transform:scale(1.3) translateY(-15px)} 50%{transform:scale(1.4) translateY(-20px)} 100%{transform:scale(1) translateY(0)} }
        @keyframes mascot-react-vanish { 0%{opacity:1;transform:scale(1)} 50%{opacity:0;transform:scale(0.5)} 51%{opacity:0;transform:scale(0.5) translateX(50px)} 100%{opacity:1;transform:scale(1) translateX(0)} }
        @keyframes mascot-react-haunt { 0%{transform:translateY(0) translateX(0)} 25%{transform:translateY(-10px) translateX(5px)} 50%{transform:translateY(-5px) translateX(-5px)} 75%{transform:translateY(-12px) translateX(3px)} 100%{transform:translateY(0) translateX(0)} }
        @keyframes mascot-react-ghostFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes mascot-react-sneakWalk { 0%,100%{transform:scaleY(0.9) translateY(3px)} 50%{transform:scaleY(0.85) translateY(5px) translateX(10px)} }
        @keyframes mascot-react-peekAround { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-15px)} 50%{transform:translateX(0)} 75%{transform:translateX(15px)} }
        @keyframes mascot-react-doubleJump { 0%{transform:translateY(0)} 20%{transform:translateY(-20px)} 35%{transform:translateY(0)} 55%{transform:translateY(-30px) scale(1.05)} 75%{transform:translateY(0)} 100%{transform:translateY(0)} }
        @keyframes mascot-react-cartwheel { 0%{transform:rotate(0) translateX(0)} 100%{transform:rotate(360deg) translateX(30px)} }
        @keyframes mascot-react-tipHat { 0%,100%{transform:rotate(0) translateY(0)} 30%{transform:rotate(-10deg) translateY(-5px)} 70%{transform:rotate(-10deg) translateY(-5px)} }
        @keyframes mascot-react-thinking { 0%,100%{transform:rotate(0)} 30%{transform:rotate(-5deg) translateY(-3px)} 70%{transform:rotate(-5deg) translateY(-3px)} }
        @keyframes mascot-react-confetti { 0%{transform:scale(1)} 20%{transform:scale(1.15) rotate(5deg)} 40%{transform:scale(1.1) rotate(-5deg)} 60%{transform:scale(1.15) rotate(3deg) translateY(-8px)} 80%{transform:scale(1.1)} 100%{transform:scale(1)} }
        @keyframes mascot-react-flexMuscle { 0%,100%{transform:scaleX(1) scaleY(1)} 30%{transform:scaleX(1.15) scaleY(0.92)} 70%{transform:scaleX(1.15) scaleY(0.92)} }
        @keyframes mascot-react-facepalm { 0%,100%{transform:rotate(0)} 30%{transform:rotate(15deg) translateY(5px)} 70%{transform:rotate(15deg) translateY(5px)} }
        @keyframes mascot-react-dab { 0%{transform:rotate(0) translateY(0)} 40%{transform:rotate(-15deg) translateY(-5px) scaleX(1.1)} 70%{transform:rotate(-15deg) translateY(-5px) scaleX(1.1)} 100%{transform:rotate(0) translateY(0)} }
        @keyframes mascot-react-meditation { 0%,100%{transform:translateY(0) scale(1)} 50%{transform:translateY(-8px) scale(1.02)} }
        @keyframes mascot-react-electricShock { 0%{transform:translate(0) scale(1)} 10%{transform:translate(3px,-2px) scale(1.05)} 20%{transform:translate(-3px,2px) scale(0.95)} 30%{transform:translate(2px,-3px) scale(1.08)} 40%{transform:translate(-2px,1px) scale(0.97)} 50%{transform:translate(0) scale(1.1)} 60%{transform:translate(0) scale(1)} 100%{transform:translate(0) scale(1)} }
        @keyframes mascot-react-bubbleBlow { 0%,100%{transform:scale(1)} 30%{transform:scale(1.05) translateY(-2px)} 60%{transform:scale(1.08) translateY(-4px)} }
        @keyframes mascot-react-rainbow { 0%{filter:hue-rotate(0deg)} 100%{filter:hue-rotate(360deg)} }
        @keyframes mascot-react-tornado { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(360deg) scale(0.8) translateY(-15px)} 100%{transform:rotate(720deg) scale(1) translateY(0)} }
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
        .mascot-react-lick{animation:mascot-react-lick 2s ease-in-out}
        .mascot-react-earTwitch{animation:mascot-react-earTwitch 0.8s ease-in-out}
        .mascot-react-headTilt{animation:mascot-react-headTilt 1.5s ease-in-out}
        .mascot-react-sniff{animation:mascot-react-sniff 1.2s ease-in-out}
        .mascot-react-scratch{animation:mascot-react-scratch 1.5s ease-in-out}
        .mascot-react-playBall{animation:mascot-react-playBall 1.5s ease-in-out}
        .mascot-react-chase{animation:mascot-react-chase 1.5s ease-in-out}
        .mascot-react-purr{animation:mascot-react-purr 2s ease-in-out infinite}
        .mascot-react-pounce{animation:mascot-react-pounce 1s ease-out}
        .mascot-react-tailWag{animation:mascot-react-tailWag 1s ease-in-out}
        .mascot-react-belly{animation:mascot-react-belly 1.5s ease-in-out}
        .mascot-react-nuzzle{animation:mascot-react-nuzzle 1.2s ease-in-out}
        .mascot-react-howl{animation:mascot-react-howl 2s ease-in-out}
        .mascot-react-dig{animation:mascot-react-dig 1.5s ease-in-out}
        .mascot-react-fetch{animation:mascot-react-fetch 1.5s ease-in-out}
        .mascot-react-blink{animation:mascot-react-blink 0.5s ease-in-out}
        .mascot-react-curious{animation:mascot-react-curious 1.5s ease-in-out}
        .mascot-react-startle{animation:mascot-react-startle 1s ease-out}
        .mascot-react-groom{animation:mascot-react-groom 2s ease-in-out}
        .mascot-react-rollOver{animation:mascot-react-rollOver 1.5s ease-in-out}
        .mascot-react-washFace{animation:mascot-react-washFace 2s ease-in-out}
        .mascot-react-kneadPaws{animation:mascot-react-kneadPaws 2s ease-in-out}
        .mascot-react-archBack{animation:mascot-react-archBack 1.5s ease-in-out}
        .mascot-react-chaseTail{animation:mascot-react-chaseTail 1.5s ease-in-out}
        .mascot-react-batAtToy{animation:mascot-react-batAtToy 1.5s ease-in-out}
        .mascot-react-boxPush{animation:mascot-react-boxPush 1.5s ease-in-out}
        .mascot-react-sunbathe{animation:mascot-react-sunbathe 2.5s ease-in-out}
        .mascot-react-purrVibrate{animation:mascot-react-purrVibrate 1.5s ease-in-out}
        .mascot-react-hiss{animation:mascot-react-hiss 1s ease-in-out}
        .mascot-react-slowBlink{animation:mascot-react-slowBlink 2s ease-in-out}
        .mascot-react-shakeFur{animation:mascot-react-shakeFur 1s ease-in-out}
        .mascot-react-sitPretty{animation:mascot-react-sitPretty 1.5s ease-in-out}
        .mascot-react-rollOnBack{animation:mascot-react-rollOnBack 2s ease-in-out}
        .mascot-react-sniffGround{animation:mascot-react-sniffGround 2s ease-in-out}
        .mascot-react-pointNose{animation:mascot-react-pointNose 1.5s ease-in-out}
        .mascot-react-tipTap{animation:mascot-react-tipTap 1s ease-in-out}
        .mascot-react-zoomies{animation:mascot-react-zoomies 1.5s ease-in-out}
        .mascot-react-headShake{animation:mascot-react-headShake 1s ease-in-out}
        .mascot-react-pawGive{animation:mascot-react-pawGive 1.5s ease-in-out}
        .mascot-react-playDead{animation:mascot-react-playDead 2s ease-in-out}
        .mascot-react-waddle{animation:mascot-react-waddle 1s ease-in-out}
        .mascot-react-slideBelly{animation:mascot-react-slideBelly 2s ease-in-out}
        .mascot-react-fishCatch{animation:mascot-react-fishCatch 1.5s ease-in-out}
        .mascot-react-huddle{animation:mascot-react-huddle 1.5s ease-in-out}
        .mascot-react-flipperClap{animation:mascot-react-flipperClap 1s ease-in-out}
        .mascot-react-glitch{animation:mascot-react-glitch 1s ease-in-out}
        .mascot-react-scanMode{animation:mascot-react-scanMode 1.5s ease-in-out}
        .mascot-react-reboot{animation:mascot-react-reboot 1.5s ease-in-out}
        .mascot-react-laserEyes{animation:mascot-react-laserEyes 1.5s ease-in-out}
        .mascot-react-systemUpdate{animation:mascot-react-systemUpdate 2s steps(1)}
        .mascot-react-phase{animation:mascot-react-phase 2s ease-in-out}
        .mascot-react-spook{animation:mascot-react-spook 1.5s ease-out}
        .mascot-react-vanish{animation:mascot-react-vanish 2s ease-in-out}
        .mascot-react-haunt{animation:mascot-react-haunt 2s ease-in-out}
        .mascot-react-ghostFloat{animation:mascot-react-ghostFloat 2s ease-in-out infinite}
        .mascot-react-sneakWalk{animation:mascot-react-sneakWalk 2s ease-in-out}
        .mascot-react-peekAround{animation:mascot-react-peekAround 2s ease-in-out}
        .mascot-react-doubleJump{animation:mascot-react-doubleJump 1.2s ease-out}
        .mascot-react-cartwheel{animation:mascot-react-cartwheel 1s ease-in-out}
        .mascot-react-tipHat{animation:mascot-react-tipHat 1.5s ease-in-out}
        .mascot-react-thinking{animation:mascot-react-thinking 2s ease-in-out}
        .mascot-react-confetti{animation:mascot-react-confetti 1.5s ease-in-out}
        .mascot-react-flexMuscle{animation:mascot-react-flexMuscle 1.5s ease-in-out}
        .mascot-react-facepalm{animation:mascot-react-facepalm 1.5s ease-in-out}
        .mascot-react-dab{animation:mascot-react-dab 1s ease-in-out}
        .mascot-react-meditation{animation:mascot-react-meditation 3s ease-in-out}
        .mascot-react-electricShock{animation:mascot-react-electricShock 1s ease-in-out}
        .mascot-react-bubbleBlow{animation:mascot-react-bubbleBlow 2s ease-in-out}
        .mascot-react-rainbow{animation:mascot-react-rainbow 2s linear}
        .mascot-react-tornado{animation:mascot-react-tornado 1.5s ease-in-out}
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

        {getMascotSVG(settings.mascot_type, settings.primary_color, settings.secondary_color, size, sleeping, walkPhase, reaction)}
      </div>
    </>
  );
}
