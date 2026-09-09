import type {MetadataRoute} from 'next';
import {color} from '@/lib/tokens';
export default function manifest():MetadataRoute.Manifest{return {id:'/',name:'Flaccid75',short_name:'Flaccid75',description:'Seven daily habits.',start_url:'/',scope:'/',display:'standalone',background_color:color.ground,theme_color:color.ground,orientation:'portrait',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};}
