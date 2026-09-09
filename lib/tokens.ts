// The single source of every color, radius, space and type size. `scripts/tokens.mjs` writes app/tokens.css from this file
// and `scripts/token-scan.mjs` fails when a stylesheet or component carries a value that is not here.
export const color={
 ground:'#f4eee6',ground2:'#ede5db',card:'#ffffff',cardTint:'#fbf7f2',line:'#e8dfd4',
 ink:'#2a2521',ink2:'#5b544d',muted:'#8d857b',
 accent:'#f08a4c',accentDeep:'#d9702f',accentSoft:'#fde4d2',accentInk:'#a8521c',
 sage:'#8fb07f',sageDeep:'#6c9160',sageSoft:'#e3ecd9',
 sky:'#8ec5d6',skySoft:'#dcecf1',skyDeep:'#5e9fb4',
 butter:'#f6c453',butterSoft:'#fbebc0',
 rose:'#f0a89c',roseSoft:'#f9e0da',
 lilac:'#b9aee0',lilacSoft:'#e9e4f4',
 cocoa:'#6b4f3f',cocoaSoft:'#d9c3b3',
 night:'#2f3550',nightSoft:'#8a90b3',
 shadow:'rgba(84,60,36,.08)',shadowDeep:'rgba(84,60,36,.16)',scrim:'rgba(42,37,33,.36)',
} as const;
export const radius={sm:'12px',md:'18px',lg:'24px',xl:'32px',pill:'999px'} as const;
export const space={0:'0px',1:'4px',2:'8px',3:'12px',4:'16px',5:'20px',6:'24px',7:'32px',8:'40px',9:'56px'} as const;
export const text={xs:'11px',sm:'13px',md:'15px',lg:'17px',xl:'22px',xxl:'28px',hero:'64px'} as const;
export const track={tight:'-.03em',snug:'-.02em',normal:'-.01em'} as const;
export const shadow={card:`0 2px 10px ${color.shadow}`,float:`0 10px 28px ${color.shadowDeep}`,sheet:`0 -8px 60px ${color.shadowDeep}`} as const;
export const font={sans:"ui-rounded,'SF Pro Rounded','Avenir Next','Nunito','Segoe UI',system-ui,sans-serif"} as const;
export const size={hairline:'1px',bw:'2px',ring:'3px',dot:'6px',meter:'8px',handle:'36px',icon:'22px',minus:'32px',cell:'36px',tap:'44px',disc:'56px',add:'56px',tile:'64px',nav:'64px',glass:'76px',bowl:'84px',bars:'150px',pair:'184px',hero:'260px',heroShort:'200px',spark:'100px',preview:'50dvh',shell:'440px',shellMax:'960px',sheet:'90dvh'} as const;
export function cssVariables(){
 const lines:string[]=[];
 for(const [k,v] of Object.entries(color))lines.push(`--c-${k}:${v}`);
 for(const [k,v] of Object.entries(radius))lines.push(`--r-${k}:${v}`);
 for(const [k,v] of Object.entries(space))lines.push(`--s-${k}:${v}`);
 for(const [k,v] of Object.entries(text))lines.push(`--t-${k}:${v}`);
 for(const [k,v] of Object.entries(track))lines.push(`--ls-${k}:${v}`);
 for(const [k,v] of Object.entries(shadow))lines.push(`--sh-${k}:${v}`);
 for(const [k,v] of Object.entries(size))lines.push(`--z-${k}:${v}`);
 lines.push(`--font:${font.sans}`);
 return `:root{${lines.join(';')}}\n`;
}
