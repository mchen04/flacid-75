// Original flat vector scenes, written by hand for this app. Every fill is a token from lib/tokens.
import {color as c} from '@/lib/tokens';
export type Phase='morning'|'day'|'evening'|'night';
const sky:Record<Phase,string>={morning:c.butterSoft,day:c.skySoft,evening:c.roseSoft,night:c.night};
const far:Record<Phase,string>={morning:c.sageSoft,day:c.sageSoft,evening:c.cocoaSoft,night:c.nightSoft};
const Cloud=({x,y,s=1,o=.95}:{x:number;y:number;s?:number;o?:number})=><g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}><path d="M0 18q-10 0-10-9t10-9q4-10 16-10t16 10q10 0 10 9t-10 9z" fill={c.card}/></g>;
const Tree=({x,y,s=1,tone=c.sageDeep}:{x:number;y:number;s?:number;tone?:string})=><g transform={`translate(${x} ${y}) scale(${s})`}><rect x="-2" y="0" width="4" height="14" rx="2" fill={c.cocoa}/><circle cx="0" cy="-6" r="11" fill={tone}/><circle cx="-6" cy="0" r="7" fill={tone}/><circle cx="6" cy="0" r="7" fill={tone}/></g>;
const Bird=({x,y,s=1}:{x:number;y:number;s?:number})=><path d="M0 0q4-5 8 0q4-5 8 0" transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={c.ink2} strokeWidth="1.6" strokeLinecap="round"/>;
// The walk path crosses the near hill; the marker slides to the flag when the walk is done.
export const walkPath='M14 176C60 172 84 150 128 148S200 166 246 150s40-28 72-28';
export const walkStart={x:14,y:176},walkEnd={x:318,y:122};
export function Hills({phase='morning',walked=false,celebrate=false,quiet=false,className=''}:{phase?:Phase;walked?:boolean;celebrate?:boolean;quiet?:boolean;className?:string}){
 const night=phase==='night';const sunTone=night?c.card:c.butter;const sunY=phase==='morning'?96:phase==='day'?54:phase==='evening'?104:52;
 return <svg className={`scene ${className}`} viewBox="0 0 360 310" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <rect width="360" height="310" fill={sky[phase]}/><g transform="translate(0 110)">
  {night&&[[40,30],[90,18],[150,40],[230,22],[290,44],[330,16],[200,70]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3?1.6:2.4} fill={c.card} opacity=".85"/>)}
  <g className="sun">{celebrate&&<g className="rays" style={{transformOrigin:`272px ${sunY+110}px`}}>{Array.from({length:12},(_,i)=><rect key={i} x="-3" y="-72" width="6" height="18" rx="3" fill={c.butter} opacity=".7" transform={`translate(272 ${sunY}) rotate(${i*30})`}/>)}</g>}
   <circle cx="272" cy={sunY} r="46" fill={sunTone} opacity={night?.12:.28}/>
   <circle cx="272" cy={sunY} r="30" fill={sunTone}/>
   {night&&<circle cx="284" cy={sunY-8} r="26" fill={sky[phase]}/>}
  </g>
  {!night&&!quiet&&<><Bird x={150} y={70}/><Bird x={182} y={58} s={.8}/></>}
  {!quiet&&<Cloud x={40} y={92} s={1.1} o={night?.25:.95}/>}<Cloud x={196} y={30} s={.85} o={night?.25:.9}/>
  <path d="M0 150C60 118 120 116 180 132S300 128 360 106V200H0z" fill={far[phase]}/>
  <path d="M0 176C70 148 140 144 210 158S330 156 360 140V200H0z" fill={night?c.nightSoft:c.sage} opacity={night?.55:1}/>
  <path d="M0 200C60 168 130 164 200 176S320 172 360 160V200z" fill={night?c.night:c.sageDeep}/>
  <Tree x={104} y={146} s={1.05} tone={night?c.nightSoft:c.sageDeep}/><Tree x={344} y={128} s={.9} tone={night?c.nightSoft:c.sageDeep}/><Tree x={296} y={142} s={.7} tone={night?c.nightSoft:c.sage}/>
  <path d={walkPath} fill="none" stroke={c.card} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" opacity=".9"/>
  <g className="flag" transform={`translate(${walkEnd.x} ${walkEnd.y})`}><rect x="-1.5" y="-30" width="3" height="32" rx="1.5" fill={c.card}/><path d="M1 -30h20l-6 7 6 7H1z" fill={c.accent}/></g>
  <g className={`walker ${walked?'is-done':''}`} style={{transform:`translate(${(walked?walkEnd:walkStart).x}px,${(walked?walkEnd:walkStart).y}px)`}}><circle r="11" fill={c.accent}/><circle r="11" fill={c.accent} className="pulse" opacity=".35"/><circle r="4.5" fill={c.card}/></g>
  {celebrate&&<g className="petals" aria-hidden="true">{[c.accent,c.rose,c.butter,c.lilac,c.sage,c.sky].flatMap((tone,i)=>[0,1,2].map(j=><rect key={i*3+j} className="petal" x={20+((i*3+j)*19)%330} y={-124} width="7" height="12" rx="3" fill={tone} style={{animationDelay:`${((i*3+j)%7)*.16}s`}}/>))}</g>}
  </g>
 </svg>;
}
export function Glass({level}:{level:number}){
 const y=Math.round((1-Math.min(1,Math.max(0,level)))*84);
 return <svg className="glass" viewBox="0 0 100 120" aria-hidden="true">
  <defs><clipPath id="glass-clip"><path d="M22 10h56l-6 96q-1 8-9 8H37q-8 0-9-8z"/></clipPath></defs>
  <path d="M22 10h56l-6 96q-1 8-9 8H37q-8 0-9-8z" fill={c.skySoft}/>
  <g clipPath="url(#glass-clip)"><g className="liquid" style={{transform:`translateY(${y}px)`}}>
   <path className="wave" d="M-100 32c12 0 12-6 25-6s13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6V160H-100z" fill={c.sky}/>
   <path className="wave wave-2" d="M-100 36c12 0 12-6 25-6s13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6 12-6 25-6 13 6 25 6V160H-100z" fill={c.skyDeep} opacity=".55"/>
   <circle className="bubble b1" cx="42" cy="100" r="3" fill={c.card} opacity=".8"/><circle className="bubble b2" cx="60" cy="108" r="2" fill={c.card} opacity=".8"/>
  </g></g>
  <path d="M22 10h56l-6 96q-1 8-9 8H37q-8 0-9-8z" fill="none" stroke={c.skyDeep} strokeWidth="3" strokeLinejoin="round"/>
  <path d="M31 24l-3 62" stroke={c.card} strokeWidth="3" strokeLinecap="round" opacity=".8"/>
  <path d="M14 10h72" stroke={c.skyDeep} strokeWidth="3" strokeLinecap="round"/>
 </svg>;
}
export function Bowl({full=false,eating=false}:{full?:boolean;eating?:boolean}){
 return <svg className={`bowl ${eating?'is-eating':''}`} viewBox="0 0 120 100" aria-hidden="true">
  <ellipse cx="60" cy="88" rx="44" ry="6" fill={c.ink} opacity=".06"/>
  <path d="M14 46h92q0 40-46 40T14 46z" fill={c.accent}/>
  <path d="M14 46h92q0 6-4 12H18q-4-6-4-12z" fill={c.accentDeep} opacity=".5"/>
  <g className="food" style={{transformOrigin:'60px 46px'}}>
   <ellipse cx="60" cy="46" rx="46" ry="9" fill={full?c.butterSoft:c.cardTint}/>
   <circle cx="42" cy="42" r="8" fill={c.sage}/><circle cx="62" cy="38" r="9" fill={c.rose}/><circle cx="80" cy="43" r="7" fill={c.butter}/>
   <path d="M50 44q4-8 12-6" stroke={c.sageDeep} strokeWidth="2.5" strokeLinecap="round" fill="none"/>
  </g>
  <g className="spoon" transform="rotate(-24 100 30)" style={{transformOrigin:'100px 30px'}}><rect x="98" y="8" width="5" height="46" rx="2.5" fill={c.cocoaSoft}/><ellipse cx="100.5" cy="8" rx="7" ry="9" fill={c.cocoaSoft}/></g>
 </svg>;
}
// Flat two-tone habit marks, used inside the round chips.
export function Mark({name}:{name:'workout'|'abs'|'floss'|'walk'|'water'|'food'|'rest'|'rescue'|'scale'}){
 const marks={
  workout:<><rect x="8" y="20" width="32" height="8" rx="4" fill={c.accentDeep}/><rect x="4" y="14" width="8" height="20" rx="3" fill={c.ink2}/><rect x="36" y="14" width="8" height="20" rx="3" fill={c.ink2}/><rect x="0" y="18" width="5" height="12" rx="2.5" fill={c.ink2}/><rect x="43" y="18" width="5" height="12" rx="2.5" fill={c.ink2}/></>,
  abs:<><rect x="6" y="30" width="36" height="8" rx="4" fill={c.accentSoft}/><path d="M14 30q2-16 12-16t12 16" fill={c.accent}/><circle cx="26" cy="12" r="6" fill={c.ink2}/><path d="M20 30h12" stroke={c.card} strokeWidth="2" strokeLinecap="round"/></>,
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
