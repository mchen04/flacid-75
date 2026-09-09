// Local probes only: route Node fetch through the shell's proxy variables. Vercel never loads this file.
import {EnvHttpProxyAgent,setGlobalDispatcher} from 'undici';
if(process.env.HTTPS_PROXY||process.env.https_proxy)setGlobalDispatcher(new EnvHttpProxyAgent());
