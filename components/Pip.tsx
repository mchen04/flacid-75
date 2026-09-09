export type Mood='hello'|'happy'|'cheer'|'cozy'|'eat'|'wink'|'effort'|'grin'|'gentle';
export type Pose='stand'|'sit'|'walk'|'lift';
const ink='#2e2a3b',body='url(#pip-body)',cream='url(#pip-belly)',peach='#f2a56a',blush='#f6b9c4';
const Defs=()=><defs><linearGradient id="pip-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9c9ed0"/><stop offset="1" stopColor="#6e70a4"/></linearGradient><radialGradient id="pip-belly" cx=".5" cy=".35" r=".7"><stop offset="0" stopColor="#fffdf9"/><stop offset="1" stopColor="#fbf3ea"/></radialGradient></defs>;
const labels:Record<Mood,string>={hello:'Pip the penguin says hello',happy:'Pip the penguin is happy',cheer:'Pip the penguin cheers',cozy:'Pip the penguin rests',eat:'Pip the penguin eats',wink:'Pip the penguin winks',effort:'Pip the penguin tries hard',grin:'Pip the penguin grins',gentle:'Pip the penguin smiles gently'};
function Eyes({mood}:{mood:Mood}){
 const open=(x:number)=><g key={x}><ellipse cx={x} cy="102" rx="14" ry="16" fill={ink}/><circle cx={x-5.5} cy="95" r="5.8" fill="#fff"/></g>;
 const arc=(x:number,down=false)=><path key={x} d={down?`M${x-9} 98q9 7 18 0`:`M${x-9} 98q9-11 18 0`} fill="none" stroke={ink} strokeWidth="4.5" strokeLinecap="round"/>;
 const squeeze=(x:number)=><path key={x} d={`M${x-7} 92l7 4-7 4`} fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" transform={x>100?`scale(-1 1) translate(${-2*x} 0)`:undefined}/>;
 if(mood==='happy'||mood==='cheer'||mood==='grin')return <g className="eyes">{arc(74)}{arc(126)}</g>;
 if(mood==='cozy')return <g className="eyes">{arc(74,true)}{arc(126,true)}</g>;
 if(mood==='effort')return <g className="eyes">{squeeze(74)}{squeeze(126)}</g>;
 if(mood==='wink')return <g className="eyes">{open(74)}{arc(126)}</g>;
 return <g className="eyes blink">{open(74)}{open(126)}</g>;
}
function Mouth({mood}:{mood:Mood}){
 if(mood==='eat')return <g><path d="M91 106q9-6 18 0-9 4-18 0z" fill={peach}/><path d="M92 111q8 11 16 0-8-3-16 0z" fill="#d97b86"/></g>;
 if(mood==='grin')return <g><path d="M91 107q9-7 18 0-4 4-9 4t-9-4z" fill={peach}/><path d="M88 116q12 14 24 0z" fill="#c9727f"/><rect x="95" y="116" width="10" height="6" rx="2" fill="#fff"/></g>;
 if(mood==='cheer')return <g><path d="M91 107q9-7 18 0-4 4-9 4t-9-4z" fill={peach}/><path d="M92 118q8 10 16 0z" fill="#c9727f"/></g>;
 return <g><path d="M92 110q8-6 16 0-3 7-8 7t-8-7z" fill={peach}/>{mood==='effort'?<path d="M94 124h12" fill="none" stroke="#c98a90" strokeWidth="2.4" strokeLinecap="round"/>:<path d="M90 121q10 11 20 0z" fill="#d9808c"/>}</g>;
}
export function Pip({mood='hello',pose='stand',className='',food}:{mood?:Mood;pose?:Pose;className?:string;food?:'meal'|'water'}){
 const up=mood==='cheer'||pose==='lift';
 const sit=pose==='sit';
 return <svg className={`pip pip-${mood} pose-${pose} ${className}`} viewBox="0 0 200 200" role="img" aria-label={labels[mood]}>
  <ellipse cx="100" cy="185" rx="52" ry="7" fill="#d9bec7" opacity=".3"/>
  <g className="feet">{sit?<><ellipse cx="82" cy="180" rx="17" ry="8" fill={peach}/><ellipse cx="118" cy="180" rx="17" ry="8" fill={peach}/></>:<><ellipse className="foot-l" cx="80" cy="184" rx="15" ry="6.5" fill={peach}/><ellipse className="foot-r" cx="120" cy="184" rx="15" ry="6.5" fill={peach}/></>}</g>
  <Defs/>
  <g className="body" transform={sit?'translate(0 18) scale(1 .9)':pose==='stand'&&(mood==='hello'||mood==='gentle'||mood==='happy')?'rotate(-7 100 184)':undefined}>
   <path d="M100 32c44 0 76 36 76 78s-32 72-76 72-76-30-76-72 32-78 76-78z" fill={body}/>
   <path d="M100 64c34 0 58 26 58 60 0 32-24 54-58 54s-58-22-58-54c0-34 24-60 58-60z" fill={cream}/>
   
   <path className="flipper flipper-l" d={up?'M46 104c-20-10-36-32-28-48 6-8 18 0 30 22':'M36 118c-10 6-16 20-10 30 4 7 14 5 18-3 3-8 1-19-8-27z'} fill={body}/>
   <path className="flipper flipper-r" d={up?'M154 104c20-10 36-32 28-48-6-8-18 0-30 22':'M164 118c10 6 16 20 10 30-4 7-14 5-18-3-3-8-1-19 8-27z'} fill={body}/>
   {pose==='lift'&&<g className="dumbbell"><rect x="26" y="40" width="148" height="7" rx="3.5" fill="#8d7aa8"/><rect x="18" y="30" width="18" height="27" rx="6" fill="#b79ccf"/><rect x="164" y="30" width="18" height="27" rx="6" fill="#b79ccf"/></g>}
   <path d="M100 36c-3-7-13-9-13-2 0 5 8 9 13 14 5-5 13-9 13-14 0-7-10-5-13 2z" fill={blush}/>
   <ellipse cx="56" cy="122" rx="13" ry="7.5" fill={blush} opacity=".85"/><ellipse cx="144" cy="122" rx="13" ry="7.5" fill={blush} opacity=".85"/>
   <Eyes mood={mood}/><Mouth mood={mood}/>
   {food==='meal'&&<g className="snack"><circle cx="100" cy="128" r="9" fill="#f5c78a"/><circle cx="97" cy="126" r="2" fill="#c96a5a"/><circle cx="104" cy="130" r="1.6" fill="#c96a5a"/></g>}
   {mood==='grin'&&<path className="floss" d="M40 120q60-22 120 0" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity=".9"/>}
  </g>
  {mood==='cheer'&&<g className="sparkles" fill="#f3c46b"><path d="m30 36 3 8 8 3-8 3-3 8-3-8-8-3 8-3zM170 42l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM164 148l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g>}
  {mood==='happy'&&<path className="heart" d="M160 62c-3-6-12-7-12-1 0 5 8 9 12 13 4-4 12-8 12-13 0-6-9-5-12 1z" fill={blush}/>}
  {mood==='cozy'&&<g className="zz" fill="#9c93ad" fontSize="16" fontWeight="700" fontFamily="Georgia,serif"><text x="150" y="60">z</text><text x="162" y="44" fontSize="12">z</text></g>}
  {mood==='effort'&&<path className="drop" d="M156 70c0 5-4 8-4 8s-4-3-4-8 4-8 4-8 4 3 4 8z" fill="#9ccbe3"/>}
 </svg>;
}
