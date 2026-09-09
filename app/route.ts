import {readFileSync} from 'node:fs';
export const dynamic='force-static';
export function GET(){
 const {script}=JSON.parse(readFileSync('public/client-assets.json','utf8'));
 const css=readFileSync('app/globals.css','utf8');
 const pip=readFileSync('public/art/pip-hello.svg','utf8');
 return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Flaccid75 · Your little routine</title><meta name="description" content="Six small habits. A softer kind of routine."><meta name="theme-color" content="#fffaf3"><meta name="robots" content="noindex,nofollow"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Flaccid75"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="/icon.svg"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="apple-touch-startup-image" href="/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"><link rel="modulepreload" href="${script}"><style>${css}</style></head><body><div id="app"><main class="gate">${pip}<h1>A little care, every day.</h1><p>Getting your day ready…</p></main></div><noscript>Enable JavaScript to open your daily routine.</noscript><script type="module" src="${script}"></script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});
}
