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
 assert.equal(h.engineVersion,'0.8.1');assert.equal(h.calculationRules,9);assert.equal(h.serviceVersion,'0.4.3');
 const call=async(method,params={})=>{
  const response=await fetch(base+'/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  assert.equal(response.status,200);return response.json();
 };
 const initialized=await call('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'api001-local-release-check',version:'1'}});
 assert.equal(initialized.result.serverInfo.version,'0.4.3');
 const list=await call('tools/list');assert.equal(list.result.tools.length,5);
 const selector=list.result.tools.find(tool=>tool.name==='calculate_localization').inputSchema.properties.selection;
 assert.deepEqual(Object.keys(selector.properties).sort(),['equipment','standard','type','usage']);
 assert.equal(selector.additionalProperties,false);
 const selection={equipment:'pump',type:'BB1',usage:'large_lng',standard:'gost'};
 const selected=await call('tools/call',{name:'calculate_localization',arguments:{ruleId:'lng',date:'2026-10-18',goal:'localization',classificationConfirmed:true,selection}});
 assert.equal(selected.result.structuredContent.result.blocked,false);
 assert.equal(selected.result.structuredContent.result.status,'unknown');
 assert.deepEqual(selected.result.structuredContent.input.selection,selection);
 const missing=await call('tools/call',{name:'calculate_localization',arguments:{ruleId:'lng',date:'2026-10-18',goal:'localization',classificationConfirmed:true}});
 assert.equal(missing.result.structuredContent.result.blocked,true);
 const invalid=await call('tools/call',{name:'calculate_localization',arguments:{ruleId:'lng',date:'2026-10-18',selection:{invented:'x'}}});
 assert(invalid.error || invalid.result?.isError);
 const bomSchema=list.result.tools.find(tool=>tool.name==='calculate_localization').inputSchema.properties.bom;
 assert.equal(bomSchema.maxItems,500);assert.equal(bomSchema.items.additionalProperties,false);
 assert.deepEqual(bomSchema.items.required.slice().sort(),['currency','origin','originBasis','quantity','unitCost']);
 const bom=[{quantity:'1',unitCost:'100',currency:'RUB',origin:'rf',originBasis:'synthetic fixture only'}];
 const bomResult=await call('tools/call',{name:'calculate_localization',arguments:{ruleId:'rotary',date:'2026-10-18',goal:'localization',classificationConfirmed:false,costs:{mode:'bom',basis:'components',bomComplete:true},bom}});
 assert.equal(bomResult.result.structuredContent.result.blocked,true);
 assert.equal(bomResult.result.structuredContent.result.status,'unknown');
 assert.equal(bomResult.result.structuredContent.result.costStatus,'met');
 assert.deepEqual(bomResult.result.structuredContent.input.bom,bom);
 const badBom=await call('tools/call',{name:'calculate_localization',arguments:{ruleId:'rotary',date:'2026-10-18',costs:{mode:'bom'},bom:[{...bom[0],name:'not allowed'}]}});
 assert(badBom.error || badBom.result?.isError);
 for(const [goal,threshold]of [['support',69],['localization',null],['registry',null],['procurement',null]]){
  const body=await call('tools/call',{name:'get_threshold_context',arguments:{ruleId:'flow-coriolis',date:'2026-10-15',goal}});
  assert.equal(body.result.structuredContent.threshold,threshold);
 }
 const search=await call('tools/call',{name:'search_localization_rules',arguments:{query:'датчики давления'}});
 assert.equal(search.result.structuredContent.results[0].id,'pressure-sensor');
 console.log(JSON.stringify({pass:true,transport:'local Render-compatible HTTP MCP',tools:5,engineVersion:h.engineVersion,api001SelectionTransport:true,api002BomTransport:true,syntheticOnly:true,productionCalls:false}));
}finally{clearTimeout(timeout);child.kill();}
