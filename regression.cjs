'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const E=require('./engine.js'),A=require('./adapter.js');
let checks=0;
const equal=(a,b)=>{assert.deepEqual(a,b);checks++;};
function input(e,goal='support',date='2026-10-15'){
 const a=E.demo(e);return {ruleId:e.id,date,goal,classificationConfirmed:true,facts:a.facts,costs:a.costs};
}
async function main(){
 equal(A.health().calculationRules,9);equal(A.health().unresolvedRules,2);equal(A.health().rules,11);
 assert(!A.health().ruleIds.includes('rzba'));checks++;
 for(const [id,max,count] of [['pressure-sensor',125,9],['moisture-meter',160,11],['gas-analyzer',175,12]]){
  const e=E.entries.find(e=>e.id===id),x=input(e);
  equal(A.getRule({ruleId:id}).rule.criteria.length,count+3);
  equal(A.getRule({ruleId:id}).rule.criteria.find(c=>c.id==='M01').manufactureOrUse,true);
  equal(A.getRule({ruleId:id}).rule.criteria.find(c=>c.id==='M01').originTerritories,['rf']);
  equal(A.calculateLocalization(x).result.points,max);
  equal(A.calculateLocalization(x).result.limit,max*0.6);
  equal(A.searchRules({query:e.code}).results.some(r=>r.id===id),true);
  x.facts.M01.route='use';x.facts.M01.place='unknown';x.facts.M01.origin='rf';
  equal(A.calculateLocalization(x).result.points,max);
  for(const origin of ['eaeu','foreign']){x.facts.M01.origin=origin;equal(A.calculateLocalization(x).result.points,max-15);}
  x.facts.M01.origin='rf';x.facts.M01.originBasis='';
  equal(A.calculateLocalization(x).result.rows.find(r=>r.id==='M01').status,'unknown');
  Object.assign(x.facts.M01,{originBasis:'Synthetic Russian origin basis',route:'manufacture',place:'rf'});
  x.facts.tu_registered.state='no';equal(A.calculateLocalization(x).result.status,'failed');
  x.facts.tu_registered.state='yes';
  const mounting=e.criteria.find(c=>c.minMountedPercent);
  for(const [percent,state] of [['69.9999','failed'],['70','met'],['70.0001','met']]){x.facts[mounting.id].mountedPercent=percent;equal(A.calculateLocalization(x).result.rows.find(r=>r.id===mounting.id).status,state);}
  Object.assign(x.facts.M01,{applicable:'no',exclusionReason:'outsourced',basis:'Synthetic contractor'});
  equal(A.calculateLocalization(x).result.maximum,null);
  Object.assign(x.facts.M01,{exclusionReason:'absent_technology',basis:'Synthetic technology exclusion'});
  equal(A.calculateLocalization(x).result.maximum,max-15);
  for(const f of Object.values(x.facts)){f.state='no';f.documentPresent=true;}
  equal(A.calculateLocalization(x).result.points,0);
 }
 equal(A.thresholdContext({ruleId:'flow-coriolis',date:'2026-10-15',goal:'support'}).threshold,69);
 for(const goal of ['localization','registry','procurement'])equal(A.thresholdContext({ruleId:'flow-coriolis',date:'2026-10-15',goal}).threshold,null);
 for(const ids of [['bad'],['M01','M01'],['kd_copies']]){assert.throws(()=>A.thresholdContext({ruleId:'pressure-sensor',date:'2026-10-15',applicableCriterionIds:ids}));checks++;}
 assert.throws(()=>A.thresholdContext({ruleId:'pressure-sensor',date:'2026-02-30'}));checks++;
 assert.throws(()=>A.calculateLocalization({ruleId:'pressure-sensor',facts:{constructor:{state:'yes'}}}));checks++;
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'navigator719-parity-'));
 try{
  require('./build-site-modules.cjs').build(temp);
  const generated=temp;
  const B=await import(pathToFileURL(path.join(generated,'adapter.mjs')));
  const N=(await import(pathToFileURL(path.join(generated,'engine.mjs')))).default;
  equal(B.health(),A.health());equal(N.entries,E.entries);
  for(const e of E.entries){
   equal(B.getRule({ruleId:e.id}),A.getRule({ruleId:e.id}));
   for(const date of ['2025-12-31','2026-10-15','2028-01-01'])for(const goal of ['localization','registry','support','procurement']){
    const x=input(e,goal,date);
    equal(B.calculateLocalization(x),A.calculateLocalization(x));
    equal(B.thresholdContext(x),A.thresholdContext(x));
    if(e.method==='points'){
     const full=E.demo(e);full.goal=goal;full.date=date;
     const r=E.evaluate(e,full);
     equal(A.thresholdContext(x).threshold,r.limit);
     const scored=e.criteria.filter(c=>c.points).map(c=>c.id).slice(1);
     for(const c of e.criteria.filter(c=>c.points)){if(!scored.includes(c.id))Object.assign(full.facts[c.id],{applicable:'no',exclusionReason:'absent_technology',basis:'Synthetic technology'});}
     equal(A.thresholdContext({...x,applicableCriterionIds:scored}).threshold,E.evaluate(e,full).limit);
    }
    for(const state of ['no','unknown']){
     const changed=JSON.parse(JSON.stringify(x));for(const f of Object.values(changed.facts))f.state=state;
     equal(B.calculateLocalization(changed),A.calculateLocalization(changed));
    }
   }
   const a=E.demo(e),snapshot=E.createSnapshot(e,a),json=JSON.parse(JSON.stringify({formatVersion:2,assessments:[a],history:[snapshot]}));
   equal(E.validateImport(json),true);
   equal(E.evaluate(json.history[0].rule,json.history[0].input),snapshot.result);
  }
  if(process.env.NAVIGATOR_HTML_SOURCE){
   const H=require(path.resolve(process.env.NAVIGATOR_HTML_SOURCE,'engine.js'));
   for(const e of E.entries){const h=H.entries.find(h=>h.id===e.id);equal(h,e);for(const goal of ['support','localization','registry','procurement']){const a=H.demo(h);a.goal=goal;equal(E.evaluate(e,a),H.evaluate(h,a));}}
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 console.log(JSON.stringify({pass:true,checks,engineVersion:E.VERSION,calculationRules:A.health().calculationRules,esmParity:true}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
