'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {pathToFileURL}=require('node:url');
const A=require('./adapter.js');
const I=require('./legal-index.cjs');
const C=require('./table-context.json');
(async()=>{
 let checks=0;
 const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
 check(C.legalVerification,'not_verified');
 check(C.positions.length,I.data.positions.length);
 check(new Set(C.positions.map(r=>r.positionId)).size,787);
 check(C.counts,{matched:564,ambiguous:73,unmatched:150});
 for(const r of C.positions){
  const result=A.getRule({ruleId:r.positionId});
  check(result.requirementContext.legalVerification,'not_verified');
  check(result.indexedPosition,I.byId.get(r.positionId));
  check(r.status,r.matches.length===1?'matched':r.matches.length>1?'ambiguous':'unmatched');
  if(!result.calculationAvailable){
   check(A.calculateLocalization({ruleId:r.positionId,date:'2026-10-15',classificationConfirmed:true}).result.status,'unknown');
   check(A.thresholdContext({ruleId:r.positionId,date:'2026-10-15'}).threshold,null);
  }
 }
 const valve=A.getRule({ruleId:'pp719-xiii-d2c5b78ddcd8'});
 check(valve.indexedPosition.text,'');
 check(valve.requirementContext.matches[0].requirementRowspan,6);
 check(valve.requirementContext.matches[0].inheritedRequirementCell,true);
 // The separate cost-limit cell must never be inherited into the GCV row by proximity.
 check(valve.requirementContext.matches[0].text.includes('30 процентов'),false);
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'719-context-'));
 try{
  require('./build-site-modules.cjs').build(output);
  const esm=await import(pathToFileURL(path.join(output,'adapter.mjs')).href);
  for(const r of C.positions)check(esm.getRule({ruleId:r.positionId}),A.getRule({ruleId:r.positionId}));
 }finally{fs.rmSync(output,{recursive:true,force:true});}
 console.log(JSON.stringify({pass:true,checks,positions:787,legalVerification:'not_verified',esmParity:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
