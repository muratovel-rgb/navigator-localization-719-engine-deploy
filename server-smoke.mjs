import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const port=String(39000+Math.floor(Math.random()*1000));
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('.',import.meta.url),env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
let diagnostics='';child.stderr.on('data',b=>diagnostics+=b);
const timeout=setTimeout(()=>{child.kill();},15000);
try{
 await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error(diagnostics||'Server exited before startup');})]);
 const base=`http://127.0.0.1:${port}`;
 const h=await (await fetch(base+'/health')).json();
 assert.equal(h.engineVersion,'0.8.1');assert.equal(h.calculationRules,9);
 const call=async(method,params={})=>{
  const response=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  assert.equal(response.status,200);return response.json();
 };
 const list=await call('tools/list');assert.equal(list.result.tools.length,5);
 for(const [goal,threshold]of [['support',69],['localization',null],['registry',null],['procurement',null]]){
  const body=await call('tools/call',{name:'get_threshold_context',arguments:{ruleId:'flow-coriolis',date:'2026-10-15',goal}});
  assert.equal(body.result.structuredContent.threshold,threshold);
 }
 const search=await call('tools/call',{name:'search_localization_rules',arguments:{query:'датчики давления'}});
 assert.equal(search.result.structuredContent.results[0].id,'pressure-sensor');
 console.log(JSON.stringify({pass:true,transport:'Render HTTP MCP',tools:5,engineVersion:h.engineVersion}));
}finally{clearTimeout(timeout);child.kill();}
