// Original flat vector scenes, written by hand for this app. Every fill is a token from lib/tokens.
import {color as c} from '@/lib/tokens';
export type Phase='morning'|'day'|'evening'|'night';
const sky:Record<Phase,string>={morning:c.butterSoft,day:c.skySoft,evening:c.roseSoft,night:c.night};
const far:Record<Phase,string>={morning:c.sageSoft,day:c.sageSoft,evening:c.cocoaSoft,night:c.nightSoft};
const Cloud=({x,y,s=1,o=.95}:{x:number;y:number;s?:number;o?:number})=><g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}><path d="M0 18q-10 0-10-9t10-9q4-10 16-10t16 10q10 0 10 9t-10 9z" fill={c.card}/></g>;
const Tree=({x,y,s=1,tone=c.sageDeep}:{x:number;y:number;s?:number;tone?:string})=><g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-2" y="0" width="4" height="14" rx="2" fill={c.cocoa}/><circle cx="0" cy="-6" r="11" fill={tone}/><circle cx="-6" cy="0" r="7" fill={tone}/><circle cx="6" cy="0" r="7" fill={tone}/></g>;
const Bird=({x,y,s=1}:{x:number;y:number;s?:number})=><path d="M0 0q4-5 8 0q4-5 8 0" transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={c.ink2} strokeWidth="1.6" strokeLinecap="round"/>;
// The walk path runs along the near ridge. The walker stands at the day's progress, so the
// scene answers "how is today going" before any number is read.
export const walkPoints:[number,number][]=[[18,338],[62,320],[106,308],[150,303],[194,305],[238,300],[280,293],[320,284]];
export const walkPath='M18 338L62 320L106 308L150 303L194 305L238 300L280 293L320 284';
export function Hills({phase='morning',walked=false,celebrate=false,quiet=false,progress,className=''}:{phase?:Phase;walked?:boolean;celebrate?:boolean;quiet?:boolean;progress?:number;className?:string}){
 const night=phase==='night';const sunTone=night?c.card:c.butter;
 const sunY=quiet?186:phase==='morning'?214:phase==='day'?188:phase==='evening'?220:190;
 const share=progress??(walked?1:0);
 const [wx,wy]=walkPoints[Math.max(0,Math.min(walkPoints.length-1,Math.round(share*(walkPoints.length-1))))];
 return <svg className={`scene ${className}`} viewBox="0 0 360 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="400" fill={sky[phase]}/>
  {night&&[[40,96],[92,80],[150,112],[232,86],[292,120],[330,78],[196,146],[68,156]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3?1.8:2.6} fill={c.card} opacity=".85"/>)}
  <g className="sun">{celebrate&&<g className="rays" style={{transformOrigin:`272px ${sunY}px`}}>{Array.from({length:12},(_,i)=><rect key={i} x="-3" y="-72" width="6" height="18" rx="3" fill={c.butter} opacity=".7" transform={`translate(272 ${sunY}) rotate(${i*30})`}/>)}</g>}
   <circle cx="272" cy={sunY} r="46" fill={sunTone} opacity={night?.12:.28}/>
   <circle cx="272" cy={sunY} r="30" fill={sunTone}/>
   {night&&<circle cx="284" cy={sunY-8} r="26" fill={sky[phase]}/>}
  </g>
  {!night&&!quiet&&<><Bird x={132} y={196}/><Bird x={166} y={180} s={.8}/></>}
  {!quiet&&<Cloud x={52} y={214} s={1.1} o={night?.25:.95}/>}<Cloud x={196} y={148} s={.85} o={night?.25:.9}/>
  <path d="M0 252C60 220 120 218 180 234S300 230 360 208V400H0z" fill={far[phase]}/>
  <path d="M0 292C70 264 140 258 210 272S330 268 360 252V400H0z" fill={night?c.nightSoft:c.sage} opacity={night?.55:1}/>
  <path d="M0 348C60 320 130 308 200 308S320 298 360 286V400H0z" fill={night?c.night:c.sageDeep}/>
  <Tree x={96} y={268} s={1.05} tone={night?c.nightSoft:c.sageDeep}/><Tree x={342} y={244} s={.9} tone={night?c.nightSoft:c.sageDeep}/><Tree x={294} y={258} s={.7} tone={night?c.nightSoft:c.sage}/>
  <path d={walkPath} fill="none" stroke={c.card} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" opacity=".9"/>
  <g className="flag" transform="translate(320 284)"><rect x="-1.5" y="-30" width="3" height="32" rx="1.5" fill={c.card}/><path d="M1 -30h20l-6 7 6 7H1z" fill={c.accent}/></g>
  <g className={`walker ${walked?'is-done':''}`} style={{transform:`translate(${wx}px,${wy}px)`}}><circle r="11" fill={c.accent}/><circle r="11" fill={c.accent} className="pulse" opacity=".35"/><circle r="4.5" fill={c.card}/></g>
  {celebrate&&<g className="petals" aria-hidden="true">{[c.accent,c.rose,c.butter,c.lilac,c.sage,c.sky].flatMap((tone,i)=>[0,1,2].map(j=><rect key={i*3+j} className="petal" x={20+((i*3+j)*19)%330} y={-14} width="7" height="12" rx="3" fill={tone} style={{animationDelay:`${((i*3+j)%7)*.16}s`}}/>))}</g>}
 </svg>;
}
export function Glass({level,pouring=false}:{level:number;pouring?:boolean}){
 const filled=Math.min(1,Math.max(0,level));const y=Math.round((1-filled)*88);
 return <svg className={`glass ${pouring?'is-pouring':''}`} viewBox="0 0 100 132" aria-hidden="true">
  <defs><clipPath id="glass-clip"><path d="M22 22h56l-6 96q-1 8-9 8H37q-8 0-9-8z"/></clipPath></defs>
  <g className="splash">{[[38,14],[50,8],[62,14]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i===1?4:3} fill={c.sky} opacity=".9"/>)}</g>
  <path d="M22 22h56l-6 96q-1 8-9 8H37q-8 0-9-8z" fill={c.skySoft}/>
  <g clipPath="url(#glass-clip)"><g className="liquid" style={{transform:`translateY(${y}px)`}}>
   <path className="wave" d="M-100 44c12 0 12-6 25-6s13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6V180H-100z" fill={c.sky}/>
   <path className="wave wave-2" d="M-100 48c12 0 12-6 25-6s13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6V180H-100z" fill={c.skyDeep} opacity=".55"/>
   <circle className="bubble b1" cx="42" cy="112" r="3" fill={c.card} opacity=".8"/><circle className="bubble b2" cx="60" cy="120" r="2" fill={c.card} opacity=".8"/>
  </g></g>
  <path d="M22 22h56l-6 96q-1 8-9 8H37q-8 0-9-8z" fill="none" stroke={c.skyDeep} strokeWidth="3" strokeLinejoin="round"/>
  <path d="M31 36l-3 62" stroke={c.card} strokeWidth="3" strokeLinecap="round" opacity=".8"/>
  <path d="M14 22h72" stroke={c.skyDeep} strokeWidth="3" strokeLinecap="round"/>
 </svg>;
}
export function Bowl({full=false,eating=false,level=0}:{full?:boolean;eating?:boolean;level?:number}){
 const filled=Math.min(1,Math.max(0,level));const rise=Math.round((1-filled)*22);
 return <svg className={`bowl ${eating?'is-eating':''}`} viewBox="0 0 120 104" aria-hidden="true">
  <defs><clipPath id="bowl-clip"><path d="M14 50h92q0 40-46 40T14 50z"/></clipPath></defs>
  <ellipse cx="60" cy="92" rx="44" ry="6" fill={c.ink} opacity=".06"/>
  <path d="M14 50h92q0 40-46 40T14 50z" fill={c.accent}/>
  <g clipPath="url(#bowl-clip)"><g className="bowl-fill" style={{transform:`translateY(${rise}px)`}}>
   <ellipse cx="60" cy="62" rx="48" ry="10" fill={c.butterSoft}/>
   <rect x="12" y="62" width="96" height="40" fill={c.butterSoft}/>
   <circle cx="40" cy="60" r="8" fill={c.sage}/><circle cx="60" cy="56" r="9" fill={c.rose}/><circle cx="80" cy="61" r="7" fill={c.butter}/>
   <path d="M48 62q4-8 12-6" stroke={c.sageDeep} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </g></g>
  <path d="M14 50h92q0 6-4 12H18q-4-6-4-12z" fill={c.accentDeep} opacity=".5"/>
  <g className="bowl-food" style={{transformOrigin:'60px 50px'}}>{!full&&filled<=0&&<ellipse cx="60" cy="50" rx="46" ry="9" fill={c.cardTint}/>}</g>
  <g className="spoon" transform="rotate(-24 100 34)" style={{transformOrigin:'100px 34px'}}><rect x="98" y="12" width="5" height="46" rx="2.5" fill={c.cocoaSoft}/><ellipse cx="100.5" cy="12" rx="7" ry="9" fill={c.cocoaSoft}/></g>
 </svg>;
}
// Flat two-tone habit marks, used inside the round chips.
export function Mark({name}:{name:'workout'|'abs'|'floss'|'walk'|'water'|'food'|'rest'|'rescue'|'scale'}){
 const marks={
  workout:<><rect x="8" y="20" width="32" height="8" rx="4" fill={c.accentDeep}/><rect x="4" y="14" width="8" height="20" rx="3" fill={c.ink2}/><rect x="36" y="14" width="8" height="20" rx="3" fill={c.ink2}/><rect x="0" y="18" width="5" height="12" rx="2.5" fill={c.ink2}/><rect x="43" y="18" width="5" height="12" rx="2.5" fill={c.ink2}/></>,
  abs:<><rect x="2" y="34" width="44" height="8" rx="4" fill={c.accentSoft}/><path d="M40 34q6-18-6-18H22q-8 0-8 8v10z" fill={c.accent}/><circle cx="12" cy="22" r="8" fill={c.ink2}/><path d="M28 16q8 2 12 10" stroke={c.accentDeep} strokeWidth="4" strokeLinecap="round" fill="none"/></>,
  floss:<><path d="M14 8h20q6 0 6 6v10q0 12-8 22h-3l-3-14h-4l-3 14h-3q-8-10-8-22V14q0-6 6-6z" fill={c.accentSoft} stroke={c.ink2} strokeWidth="2"/><path d="M6 30c8-6 28-6 36 0" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" fill="none"/><circle cx="6" cy="30" r="3.5" fill={c.accent}/><circle cx="42" cy="30" r="3.5" fill={c.accent}/></>,
  walk:<><path d="M12 30q0-8 6-8t6 8v6q0 6-6 6t-6-6z" fill={c.accent}/><path d="M26 16q0-8 6-8t6 8v6q0 6-6 6t-6-6z" fill={c.accentDeep}/><circle cx="13" cy="17" r="2.5" fill={c.accent}/><circle cx="18" cy="15" r="2.5" fill={c.accent}/><circle cx="27" cy="3" r="2.5" fill={c.accentDeep}/><circle cx="32" cy="1.5" r="2.5" fill={c.accentDeep}/></>,
  water:<path d="M24 4S8 22 8 31a16 16 0 0 0 32 0c0-9-16-27-16-27z" fill={c.sky}/>,
  food:<><path d="M6 24h36q0 18-18 18T6 24z" fill={c.accent}/><circle cx="18" cy="20" r="5" fill={c.sage}/><circle cx="30" cy="18" r="6" fill={c.rose}/></>,
  rest:<><path d="M30 6a16 16 0 1 0 12 26A14 14 0 0 1 30 6z" fill={c.accent}/><circle cx="12" cy="10" r="2" fill={c.accentSoft}/><circle cx="8" cy="20" r="1.5" fill={c.accentSoft}/></>,
  rescue:<path d="M24 42S6 30 6 18a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 12-18 24-18 24z" fill={c.rose}/>,
  scale:<><rect x="8" y="14" width="32" height="28" rx="6" fill={c.lilacSoft}/><path d="M16 26q8-8 16 0" stroke={c.lilac} strokeWidth="3" strokeLinecap="round" fill="none"/><path d="M24 26l3-5" stroke={c.ink2} strokeWidth="2.5" strokeLinecap="round"/></>,
 };
 return <svg className="mark" viewBox="0 0 48 48" aria-hidden="true">{marks[name]}</svg>;
}
// The brand mark: a sun rising over two hills. Used for the app icon and the splash screen.
export function Brand({size=512,padded=true}:{size?:number;padded?:boolean}){
 return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 512 512" aria-hidden="true">
  <rect width="512" height="512" rx={padded?116:0} fill={c.ground}/>
  <circle cx="330" cy="212" r="120" fill={c.butter} opacity=".3"/><circle cx="330" cy="212" r="78" fill={c.butter}/>
  <path d="M0 356C90 300 190 292 300 330S430 330 512 286V512H0z" fill={c.sage}/>
  <path d="M0 512V420C110 372 210 372 300 408S420 400 512 372V512z" fill={c.sageDeep}/>
  <path d="M40 470C120 452 190 420 250 400S380 390 480 372" fill="none" stroke={c.card} strokeWidth="14" strokeLinecap="round" strokeDasharray="2 30"/>
  <circle cx="250" cy="400" r="30" fill={c.accent}/><circle cx="250" cy="400" r="12" fill={c.card}/>
 </svg>;
}

// One scene per habit tab, drawn on a tall canvas so a phone-shaped stage crops almost
// nothing. Copy sits over the top left, so nothing important goes above y=180 on the left.
// `active` runs the tap animation; `done` holds the finished pose after it ends.
const Window=({x,y}:{x:number;y:number})=><g transform={`translate(${x} ${y})`}><rect width="104" height="120" rx="16" fill={c.skySoft}/><circle cx="70" cy="36" r="18" fill={c.butter}/><path d="M0 84c22-16 40-16 52-6s30 8 52-10v36q0 16-16 16H16Q0 120 0 104z" fill={c.sageSoft}/><rect x="48" y="0" width="8" height="120" fill={c.card} opacity=".7"/><rect x="0" y="56" width="104" height="8" fill={c.card} opacity=".7"/><rect width="104" height="120" rx="16" fill="none" stroke={c.card} strokeWidth="7"/></g>;
const Plant=({x,y,s=1}:{x:number;y:number;s?:number})=><g transform={`translate(${x} ${y}) scale(${s})`}><path d="M0 0q-30-18-24-52 26 4 26 34" fill={c.sage}/><path d="M2 0q28-22 22-56-28 8-26 38" fill={c.sageDeep}/><path d="M-22 0h46l-6 40q-1 8-9 8h-16q-8 0-9-8z" fill={c.cocoaSoft}/></g>;
export function Gym({done=false,active=false}:{done?:boolean;active?:boolean}){
 return <svg className={`scene gym ${done?'is-done':''} ${active?'is-active':''}`} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="640" fill={c.butterSoft}/>
  <g className="gym-clock"><circle cx="180" cy="150" r="38" fill={c.card}/><circle cx="180" cy="150" r="38" fill="none" stroke={c.cocoaSoft} strokeWidth="7"/><path d="M180 128v24l16 10" stroke={c.ink2} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></g>
  <rect x="0" y="556" width="360" height="84" fill={c.cocoaSoft}/><rect x="0" y="556" width="360" height="8" fill={c.cocoa} opacity=".2"/>
  <Plant x={44} y={556} s={1.05}/>
  <g opacity=".9"><rect x="288" y="524" width="54" height="12" rx="6" fill={c.cocoa} opacity=".5"/><circle cx="292" cy="530" r="14" fill={c.ink2}/><circle cx="338" cy="530" r="14" fill={c.ink2}/></g>
  <ellipse cx="180" cy="558" rx="78" ry="11" fill={c.cocoa} opacity=".2"/>
  <g className="lifter">
   <g className="lift-arms"><rect x="138" y="292" width="19" height="150" rx="9" fill={c.accentDeep}/><rect x="203" y="292" width="19" height="150" rx="9" fill={c.accentDeep}/></g>
   <rect x="148" y="452" width="22" height="106" rx="11" fill={c.ink2}/><rect x="190" y="452" width="22" height="106" rx="11" fill={c.ink2}/>
   <rect x="146" y="368" width="68" height="118" rx="32" fill={c.accent}/>
   <circle cx="180" cy="338" r="31" fill={c.cocoa}/>
   <circle cx="170" cy="334" r="4" fill={c.card}/><circle cx="192" cy="334" r="4" fill={c.card}/>
   <path d="M170 350q10 7 20 0" stroke={c.card} strokeWidth="4" strokeLinecap="round" fill="none"/>
   <g className="barbell"><rect x="60" y="286" width="240" height="16" rx="8" fill={c.ink2}/>
    <rect x="52" y="258" width="26" height="72" rx="11" fill={c.accentDeep}/><rect x="282" y="258" width="26" height="72" rx="11" fill={c.accentDeep}/>
    <rect x="86" y="270" width="17" height="48" rx="8" fill={c.ink}/><rect x="257" y="270" width="17" height="48" rx="8" fill={c.ink}/></g>
  </g>
 </svg>;
}
export function Mat({done=false,active=false}:{done?:boolean;active?:boolean}){
 return <svg className={`scene mat ${done?'is-done':''} ${active?'is-active':''}`} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="640" fill={c.lilacSoft}/>
  <Window x={238} y={168}/>
  <rect x="0" y="486" width="360" height="154" fill={c.cardTint}/>
  <Plant x={318} y={620} s={1.15}/>
  <g><rect x="42" y="546" width="30" height="62" rx="14" fill={c.sky}/><rect x="49" y="532" width="16" height="18" rx="7" fill={c.skyDeep}/></g>
  <ellipse cx="180" cy="492" rx="152" ry="15" fill={c.lilac} opacity=".35"/>
  <rect x="28" y="446" width="304" height="48" rx="24" fill={c.lilac}/>
  <rect x="28" y="446" width="304" height="15" rx="8" fill={c.card} opacity=".4"/>
  <g className="crunch-body">
   <path d="M212 452q48-86 94-6" stroke={c.ink2} strokeWidth="38" strokeLinecap="round" fill="none"/>
   <rect x="286" y="388" width="32" height="62" rx="16" fill={c.ink2} transform="rotate(12 302 419)"/>
   <g className="pose pose-rest"><g>
    <rect x="92" y="430" width="152" height="56" rx="28" fill={c.accent}/>
    <circle cx="82" cy="442" r="36" fill={c.cocoa}/>
    <circle cx="70" cy="434" r="4.6" fill={c.card}/><circle cx="94" cy="434" r="4.6" fill={c.card}/>
    <path d="M70 454q12 9 24 0" stroke={c.card} strokeWidth="4.6" strokeLinecap="round" fill="none"/>
    <path d="M150 424q-26 8-34 26" stroke={c.accentDeep} strokeWidth="22" strokeLinecap="round" fill="none"/>
   </g></g>
   <g className="pose pose-up" transform="rotate(-36 244 458)"><g>
    <rect x="92" y="430" width="152" height="56" rx="28" fill={c.accent}/>
    <circle cx="82" cy="442" r="36" fill={c.cocoa}/>
    <circle cx="70" cy="434" r="4.6" fill={c.card}/><circle cx="94" cy="434" r="4.6" fill={c.card}/>
    <path d="M70 454q12 9 24 0" stroke={c.card} strokeWidth="4.6" strokeLinecap="round" fill="none"/>
    <path d="M150 424q-26 8-34 26" stroke={c.accentDeep} strokeWidth="22" strokeLinecap="round" fill="none"/>
   </g></g>
  </g>
  <g className="crunch-spark">{[[96,306],[58,350],[142,268]].map(([x,y],i)=><path key={i} d={`M${x} ${y}l6 12 12 6-12 6-6 12-6-12-12-6 12-6z`} fill={c.butter}/>)}</g>
 </svg>;
}
export function Tooth({done=false,active=false}:{done?:boolean;active?:boolean}){
 return <svg className={`scene tooth ${done?'is-done':''} ${active?'is-active':''}`} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="640" fill={c.skySoft}/>
  <circle cx="180" cy="430" r="168" fill={c.card} opacity=".45"/>
  <ellipse cx="180" cy="588" rx="104" ry="15" fill={c.skyDeep} opacity=".18"/>
  <g className="tooth-body">
   <path d="M104 262h152q37 0 37 39v54q0 80-49 144h-22l-17-90h-25l-17 90h-22q-49-64-49-144v-54q0-39 37-39z" fill={c.card} stroke={c.skyDeep} strokeWidth="8" strokeLinejoin="round"/>
   <circle cx="146" cy="366" r="11" fill={c.ink}/><circle cx="214" cy="366" r="11" fill={c.ink}/>
   <path d="M144 410q36 30 72 0" stroke={c.ink} strokeWidth="9" strokeLinecap="round" fill="none"/>
   <circle cx="116" cy="398" r="15" fill={c.rose} opacity=".5"/><circle cx="244" cy="398" r="15" fill={c.rose} opacity=".5"/>
  </g>
  <g className="floss-string"><path d="M50 236q130 52 260 0" stroke={c.accent} strokeWidth="9" strokeLinecap="round" fill="none"/><circle cx="50" cy="236" r="17" fill={c.accentDeep}/><circle cx="310" cy="236" r="17" fill={c.accentDeep}/></g>
  <g className="tooth-spark">{[[74,268],[288,262],[180,196],[312,414],[46,424]].map(([x,y],i)=><path key={i} className={`spark s${i}`} d={`M${x} ${y}l6 13 13 6-13 6-6 13-6-13-13-6 13-6z`} fill={c.butter}/>)}</g>
 </svg>;
}
export function NightRest({done=false,active=false}:{done?:boolean;active?:boolean}){
 return <svg className={`scene night ${done?'is-done':''} ${active?'is-active':''}`} viewBox="0 0 360 640" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="640" fill={c.night}/>
  {[[54,214],[104,184],[158,230],[228,194],[292,240],[322,190],[196,270],[76,294],[268,308],[130,330],[40,352]].map(([x,y],i)=><circle key={i} className={`star st${i%4}`} cx={x} cy={y} r={i%3?2.4:3.4} fill={c.card} opacity=".85"/>)}
  <g className="moon"><circle cx="250" cy="226" r="56" fill={c.butter} opacity=".14"/><circle cx="250" cy="226" r="36" fill={c.butterSoft}/><circle cx="265" cy="213" r="30" fill={c.night}/></g>
  <path d="M0 470C70 438 140 434 210 448S330 446 360 430V640H0z" fill={c.nightSoft} opacity=".35"/>
  <path d="M0 536C80 512 150 510 220 522S330 518 360 508V640H0z" fill={c.nightSoft} opacity=".65"/>
  <g className="sleeper">
   <ellipse cx="184" cy="598" rx="110" ry="15" fill={c.night} opacity=".45"/>
   <rect x="72" y="548" width="76" height="34" rx="17" fill={c.card} opacity=".85"/>
   <path d="M140 582h124q34 0 34-22t-34-22H140z" fill={c.lilac}/>
   <path d="M140 542h124q22 0 30 10H140z" fill={c.lilacSoft} opacity=".8"/>
   <circle cx="116" cy="538" r="31" fill={c.cardTint}/>
   <path d="M104 532q11 9 22 0" stroke={c.ink2} strokeWidth="4" strokeLinecap="round" fill="none"/>
   <circle cx="140" cy="548" r="7" fill={c.rose} opacity=".45"/>
  </g>
  <g className="zzz" fill={c.card}><text x="158" y="504" fontSize="26" fontWeight="700">z</text><text x="182" y="470" fontSize="32" fontWeight="700">z</text><text x="212" y="432" fontSize="40" fontWeight="700">z</text></g>
 </svg>;
}
