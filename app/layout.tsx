import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Flaccid75',description:'Seven daily habits with Pip.',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Flaccid75',startupImage:[{url:'/splash-1170x2532.png',media:'(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)'}]},icons:{icon:'/icon.svg',apple:'/apple-touch-icon.png'},robots:{index:false,follow:false}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#fffaf3'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
