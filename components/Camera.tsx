import {useEffect,useRef,useState} from 'react';
import {Icon} from './Icon';
export function Camera({onCapture,onChoose,onText}:{onCapture:(photo:File)=>void;onChoose:()=>void;onText:()=>void}){
 const video=useRef<HTMLVideoElement>(null);const stream=useRef<MediaStream|null>(null);const [error,setError]=useState('');const [ready,setReady]=useState(false);
 useEffect(()=>{let active=true;const stop=()=>{stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;};
 navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280}},audio:false}).then(media=>{if(!active){media.getTracks().forEach(track=>track.stop());return;}stream.current=media;if(video.current)video.current.srcObject=media;}).catch(()=>setError('The camera could not open.'));
 if(!navigator.mediaDevices)setError('No camera here.');
 const pause=()=>{if(document.hidden){stop();setReady(false);setError('The camera paused. Open it again when ready.');}};document.addEventListener('visibilitychange',pause);
 return()=>{active=false;stop();document.removeEventListener('visibilitychange',pause);};
 },[]);
 function capture(){const element=video.current;if(!element||!ready)return;setReady(false);const canvas=document.createElement('canvas');const scale=Math.min(1,1200/element.videoWidth);canvas.width=Math.round(element.videoWidth*scale);canvas.height=Math.round(element.videoHeight*scale);canvas.getContext('2d')!.drawImage(element,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>{canvas.width=1;canvas.height=1;stream.current?.getTracks().forEach(track=>track.stop());if(blob)onCapture(new File([blob],'meal.jpg',{type:'image/jpeg'}));else setError('The photo could not be taken.');},'image/jpeg',.8);}
 return <div className="camera-view">{error?<p className="form-error" role="alert">{error}</p>:<video className="camera-preview" ref={video} playsInline muted autoPlay onLoadedData={()=>setReady(true)} aria-label="Live meal camera"/>}<button className="shutter" aria-label="Take meal photo" disabled={!ready||!!error} onClick={capture}><Icon name="camera" size={30}/></button><p className="fine-print">The photo is never saved.</p><div className="camera-fallbacks"><button className="text-button" onClick={onChoose}>Choose a photo</button><button className="text-button" onClick={onText}>Describe it instead</button></div></div>;
}
