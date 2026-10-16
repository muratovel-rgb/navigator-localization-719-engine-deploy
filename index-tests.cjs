'use strict';
const assert=require('node:assert/strict'),A=require('./adapter.js'),I=require('./legal-index.cjs');
let checks=0;const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
eq(A.health().indexedPositions,787);eq(A.health().indexedSections,29);eq(A.health().calculationRules,9);eq(A.health().fullLegalCoverageVerified,false);
for(const p of I.data.positions){
 const r=A.getRule({ruleId:p.id});eq(r.indexedPosition,p);
 const results=I.search(p.codes[0]);eq(results.some(x=>x.id===p.id),true);
 if(!r.calculationAvailable){
  const calc=A.calculateLocalization({ruleId:p.id,date:'2026-10-15',classificationConfirmed:true});
  eq(calc.result.blocked,true);eq(calc.result.status,'unknown');
  eq(A.thresholdContext({ruleId:p.id,date:'2026-10-15',goal:'registry'}).threshold,null);
 }
}
const page=A.searchRules({query:'28',limit:7});eq(page.results.length,7);eq(page.nextOffset,7);
const all=[];let offset=0;do{const p=A.searchRules({query:'28',limit:100,offset});all.push(...p.results);offset=p.nextOffset;}while(offset!==null);
eq(all.length,A.searchRules({query:'28'}).totalResults);
eq(A.searchRules({query:'несуществующее_изделие'}).results,[]);
assert.match(A.searchRules({query:'несуществующее_изделие'}).notice,/не подтверждает отсутствие/);checks++;
assert.throws(()=>A.searchRules({query:'  '}));checks++;
for(const input of [{limit:0},{limit:101},{offset:-1}]){assert.throws(()=>A.searchRules({query:'28',...input}));checks++;}
const gcv=A.searchRules({query:'28.14.13.121',limit:100});assert(gcv.matchingPositions>0);checks++;
assert(gcv.results.some(r=>r.resultType==='indexed_position'));checks++;
eq(A.searchRules({query:'датчики давления'}).results[0].id,'pressure-sensor');
for(const p of I.data.positions.filter(p=>p.codeInherited||p.textNeedsContext)){
 const x=A.getRule({ruleId:p.id}).indexedPosition;eq(x.codeInherited,p.codeInherited);eq(x.textNeedsContext,p.textNeedsContext);
}
console.log(JSON.stringify({pass:true,checks,indexed:787,sections:29,fullLegalCoverageVerified:false}));
