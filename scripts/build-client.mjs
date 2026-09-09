import {build} from 'esbuild';
import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const result=await build({entryPoints:['lib/browser-entry.tsx'],bundle:true,minify:true,write:false,format:'esm',target:['safari16','chrome110'],jsx:'automatic',jsxImportSource:'preact',alias:{react:'preact/compat','react-dom/client':'preact/compat/client','react-dom':'preact/compat','react/jsx-runtime':'preact/jsx-runtime'},define:{'process.env.NODE_ENV':'"production"'},legalComments:'none'});
const sw=await readFile('scripts/sw-template.js','utf8');
const code=result.outputFiles[0].contents;const css=await readFile('app/globals.css','utf8');const id=createHash('sha256').update(code).update(css).update(sw).digest('hex').slice(0,12);
await mkdir('public/assets',{recursive:true});for(const file of await readdir('public/assets'))if(/^app-[a-f0-9]+\.js$/.test(file))await unlink('public/assets/'+file);
await writeFile(`public/assets/app-${id}.js`,code);await writeFile('public/client-assets.json',JSON.stringify({script:`/assets/app-${id}.js`,version:id}));
await writeFile('public/sw.js',sw.replace('__VERSION__',id));console.log('Built phone renderer',id,code.length,'bytes');
