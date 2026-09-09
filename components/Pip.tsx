export function Pip({pose='hello',className=''}:{pose?:'hello'|'cheer'|'cozy';className?:string}){
 const cheer=pose==='cheer',cozy=pose==='cozy';
 return <svg className={'pip '+className} viewBox="0 0 200 200" role="img" aria-label={cheer?'Pip the penguin celebrates with you':cozy?'Pip the penguin rests beside you':'Pip the penguin says hello'}>
  <ellipse cx="103" cy="181" rx="59" ry="9" fill="#d9bec7" opacity=".28"/>
  <path d="M74 169q-25 6-23 14 15 9 37-2m29-12q27 3 29 13-12 11-35-1" fill="#e9ad89"/>
  <path d={cheer?'M56 88Q8 43 13 83q10 26 44 44':'M56 93Q17 104 24 144q6 12 25-10'} fill="#666375"/>
  <path d={cheer?'M144 87q49-48 45-8-7 32-44 48':cozy?'M144 106q26 22 21 39-11 13-33-10':'M145 100q35-34 34-12 0 24-31 45'} fill="#666375"/>
  <path d="M41 120C36 72 57 35 97 35c42-1 67 35 62 90-2 35-18 53-58 53-40 0-57-20-60-58" fill="#747183"/>
  <path d="M100 61C80 43 56 61 56 88c-1 18-8 35-2 54 6 19 25 24 47 24s42-7 48-26c5-18-4-39-5-54-1-24-24-42-44-25" fill="#fffaf3"/>
  <path d="M98 36q-15-22-6-22 11 0 15 20 4-19 15-14 3 7-13 19" fill="#747183"/>
  {cozy?<g fill="none" stroke="#494353" strokeWidth="4" strokeLinecap="round"><path d="M69 97q7 7 14 0m34 0q7 7 14 0"/></g>:cheer?<g fill="none" stroke="#494353" strokeWidth="4" strokeLinecap="round"><path d="M69 99q7-10 14 0m34 0q7-10 14 0"/></g>:<g fill="#494353"><ellipse cx="77" cy="97" rx="5" ry="7"/><ellipse cx="123" cy="97" rx="5" ry="7"/><circle cx="79" cy="95" r="1.7" fill="white"/><circle cx="125" cy="95" r="1.7" fill="white"/></g>}
  <ellipse cx="65" cy="110" rx="10" ry="6" fill="#edb8c1"/><ellipse cx="136" cy="110" rx="10" ry="6" fill="#edb8c1"/>
  <path d="M92 109q8-7 16 0-4 12-9 11-5-2-7-11" fill="#e9ad89"/>
  <path d="M87 141q-7-10-13-3-7 9 14 20 22-15 12-21-7-4-13 4" fill="#e7b5c2"/>
  {cheer&&<g fill="#d4ad64"><path d="m32 29 3 8 9 3-9 3-3 9-3-9-8-3 8-3zM166 35l2 7 8 2-8 3-2 7-3-7-7-3 7-2z"/><circle cx="177" cy="136" r="3"/></g>}
 </svg>;
}
