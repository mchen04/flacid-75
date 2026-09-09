export function Icon({name,size=22}:{name:string;size?:number}){
 const paths:Record<string,React.ReactNode>={
 workout:<><path d="M3 10v4m3-6v8m12-8v8m3-6v4M6 12h12"/></>,
 abs:<><rect x="7" y="4" width="10" height="16" rx="4"/><path d="M12 5v14M7.5 9.5h9M7.5 14.5h9"/></>,
 walk:<><path d="M9 3c3 0 4 3 3 6l-2 6-5-1 1-7q1-4 3-4m-5 14 5 1-1 3H3zm14-7c-3 0-4 3-3 6l2 3 4-1-1-5q0-3-2-3"/></>,
 water:<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12ZM9 15q0 3 3 3"/>,
 protein:<><path d="M6 19c-8-5 0-18 10-13 4 2 6 9 1 12-3 2-6 0-11 1Z"/><path d="M8 13q-3-4 2-4m4 5 2-3"/></>,
 calories:<><path d="M5 10h14l-2 10H7L5 10ZM3 10h18M8 7c-3-3 3-3 0-6m7 6c-3-3 3-3 0-6"/></>,
 camera:<><path d="M3 7h4l2-3h6l2 3h4v13H3Z"/><circle cx="12" cy="13" r="4"/></>,
 home:<><path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/></>,
 calendar:<><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 10h18m-14 5h1m4 0h1m4 0h1"/></>,
 trends:<path d="M4 3v18h17M7 15l4-5 4 3 6-8"/>,
 settings:<><circle cx="12" cy="12" r="4"/><path d="m10 3 4 0 1 3 3 0 2 4-2 2 2 3-2 3-3 0-1 3h-4l-1-3H6l-2-3 2-3-2-2 2-4h3z"/></>,
 check:<path d="m5 12 4 4L19 6"/>,
 leaf:<><path d="M19 3C5 2 1 10 7 16c6 7 14-1 12-13ZM5 21l10-12"/></>,
 arrow:<path d="m9 5 7 7-7 7"/>,
 close:<path d="m6 6 12 12M6 18 18 6"/>,
 flag:<><path d="M6 21V4m0 0h11l-3 4 3 4H6"/></>,
 edit:<><path d="m4 16 12-12 4 4L8 20H4v-4Zm10-10 4 4"/></>,
 minus:<path d="M5 12h14"/>,
 floss:<><path d="M7 8h10a2 2 0 0 1 2 2v2c0 4-2 6-3.5 8h-1L13 15h-2l-1.5 5h-1C7 18 5 16 5 12v-2a2 2 0 0 1 2-2Z"/><path d="M4 6c5-2 11-2 16 0"/></>,
 rest:<><path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z"/><path d="M15 4h4l-4 4h4"/></>,
 plus:<path d="M12 5v14M5 12h14"/>,
 back:<path d="m15 5-7 7 7 7"/>,
 };
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]??paths.leaf}</svg>;
}
