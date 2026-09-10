import {build} from 'esbuild';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
// One entry plus lazily loaded chunks (Settings and its forms). The entry is the critical path and carries the budget; chunks are
// prefetched by the shell and cached by the service worker, so they are there offline without being in the first paint.
const result=await build({entryPoints:['lib/browser-entry.tsx'],bundle:true,minify:true,write:false,format:'esm',splitting:true,outdir:'public/assets',entryNames:'app-[hash]',chunkNames:'chunk-[hash]',target:['safari16','chrome110'],jsx:'automatic',jsxImportSource:'preact',alias:{react:'preact/compat','react-dom/client':'preact/compat/client','react-dom':'preact/compat','react/jsx-runtime':'preact/jsx-runtime'},define:{'process.env.NODE_ENV':'"production"'},legalComments:'none'});
const sw=await readFile('scripts/sw-template.js','utf8');
const css=await readFile('app/tokens.css','utf8')+await readFile('app/globals.css','utf8');
const files=result.outputFiles.map(f=>({name:f.path.slice(f.path.lastIndexOf('/')+1),contents:f.contents}));
const hash=createHash('sha256');for(const f of files)hash.update(f.contents);const id=hash.update(css).update(sw).digest('hex').slice(0,12);
await mkdir('public/assets',{recursive:true});for(const file of await readdir('public/assets'))if(/^(app|chunk)-[a-zA-Z0-9]+\.js$/.test(file))await unlink('public/assets/'+file);
for(const f of files)await writeFile('public/assets/'+f.name,f.contents);
const entry=files.find(f=>f.name.startsWith('app-'));const chunks=files.filter(f=>f.name.startsWith('chunk-')).map(f=>'/assets/'+f.name);
await writeFile('public/client-assets.json',JSON.stringify({script:'/assets/'+entry.name,chunks,version:id}));
await writeFile('public/sw.js',sw.replace('__VERSION__',id));console.log('Built phone renderer',id,entry.contents.length,'bytes entry,',chunks.length,'chunk(s)');
