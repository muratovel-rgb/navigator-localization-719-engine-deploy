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
// SEARCH-001: a publisher footnote is not an OKPD2 code. Keep the raw
// index unchanged and retain actual two-digit codes and group matches.
const rawIndex=JSON.stringify(I.data);
const fixtures=[
 {id:'search001-note',codeText:'20.16.10.110 <11>',codes:['20.16.10.110','11'],title:'Synthetic polymer'},
 {id:'search001-nested-note',codeText:'28.14.13 < 11(1) >',codes:['28.14.13','11'],title:'Synthetic valve'},
 {id:'search001-group',codeText:'Из 20',codes:['20'],title:'Synthetic group'},
 {id:'search001-real',codeText:'11',codes:['11'],title:'Synthetic actual code'},
 {id:'search001-multiple',codeText:'из 26.51.52.110; 26.51.52.120 <11>',codes:['26.51.52.110','26.51.52.120','11'],title:'Synthetic instruments'}
];
const fixtureIds=q=>I.search(q).map(p=>p.id).filter(id=>id.startsWith('search001-'));
I.data.positions.push(...fixtures);
try{
 eq(fixtureIds('11'),['search001-real']);
 eq(fixtureIds('20.16.10.110'),['search001-note','search001-group']);
 eq(fixtureIds('201610110'),['search001-note','search001-group']);
 eq(fixtureIds('20.99.99'),['search001-group']);
 eq(fixtureIds('28.14.13.121'),['search001-nested-note']);
 eq(fixtureIds('26.51.52.120'),['search001-multiple']);
 eq(fixtureIds('synthetic polymer'),['search001-note']);
 eq(fixtures[0].codes,['20.16.10.110','11']);
}finally{I.data.positions.splice(-fixtures.length);}
eq(JSON.stringify(I.data),rawIndex);
eq(A.searchRules({query:'11'}).totalResults,0);

// Exercise the existing generator, not a handwritten second implementation.
// Compare every indexed code query and representative text queries at the
// index and public adapter layers, including result ordering and pagination.
(async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {pathToFileURL}=require('node:url');
 const output=fs.mkdtempSync(path.join(os.tmpdir(),'search001-esm-'));
 try{
  require('./build-site-modules.cjs').build(output);
  const esm=(await import(pathToFileURL(path.join(output,'legal-index.mjs')).href)).default;
  const adapter=await import(pathToFileURL(path.join(output,'adapter.mjs')).href);
  const queries=new Set(I.data.positions.flatMap(p=>p.codes));
  for(const q of ['11','20','28.14.13.121','281413121','датчики давления','расходомер','несуществующее_изделие'])queries.add(q);
  for(const query of queries){
   eq(esm.search(query),I.search(query));
   eq(adapter.searchRules({query,limit:7,offset:0}),A.searchRules({query,limit:7,offset:0}));
   eq(adapter.searchRules({query,limit:7,offset:7}),A.searchRules({query,limit:7,offset:7}));
  }
  eq(adapter.health(),A.health());
  eq(JSON.stringify(I.data),rawIndex);
  console.log(JSON.stringify({pass:true,checks,indexed:787,sections:29,fullLegalCoverageVerified:false,searchParityQueries:queries.size,rawIndexPreserved:true}));
 }finally{fs.rmSync(output,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
