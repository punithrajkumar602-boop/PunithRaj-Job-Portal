import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {suite} from './integration.mjs';
const run=promisify(execFile);
await suite(async(url,o={})=>{
 const args=['-sS','--max-time','25','-X',o.method||'GET'];
 for(const [k,v] of Object.entries(o.headers||{}))args.push('-H',`${k}: ${v}`);
 if(o.body)args.push('--data-binary',o.body);
 args.push('-D','-','-w','\n__STATUS__%{http_code}',url);
 const {stdout}=await run('curl',args,{maxBuffer:2*1024*1024});
 const status=Number(stdout.slice(stdout.lastIndexOf('__STATUS__')+10).trim());
 let result=stdout.slice(0,stdout.lastIndexOf('\n__STATUS__'));
 const pos=result.lastIndexOf('\r\n\r\n');
 const headerText=result.slice(0,pos),body=result.slice(pos+4);
 const headers={};for(const line of headerText.split('\r\n')){const p=line.indexOf(':');if(p>0)headers[line.slice(0,p).toLowerCase()]=line.slice(p+1).trim();}
 console.log(`${o.method||'GET'} ${new URL(url).pathname}: ${status}`);
 return new Response(body,{status,headers});
});
