'use strict';
const assert=require('node:assert/strict');
const A=require('./adapter.js'),E=require('./engine.js');
const entry=E.entries.find(e=>e.id==='rotary');
const base={ruleId:'rotary',date:'2026-10-18',goal:'localization',classificationConfirmed:true,costs:{mode:'bom',basis:'components',bomComplete:true}};
const line=(unitCost='90',origin='rf',originBasis='synthetic fixture only')=>({quantity:'1',unitCost,currency:'RUB',origin,originBasis});
const cases=[
 {id:'at-boundary',bom:[line('90'),line('10','foreign')]},
 {id:'below-boundary',bom:[line('90.0001'),line('9.9999','foreign')]},
 {id:'above-boundary',bom:[line('89.9999'),line('10.0001','foreign')]},
 {id:'unknown-origin',bom:[line('90'),line('10','unknown')]},
 {id:'missing-origin-basis',bom:[line('90'),line('10','foreign','')]},
 {id:'invalid-quantity',bom:[{...line(),quantity:'0'}]},
 {id:'negative-price',bom:[line('-1')]},
 {id:'unknown-price',bom:[line('')]},
 {id:'other-currency',bom:[{...line(),currency:'USD'}]},
 {id:'empty-list',bom:[]},
 {id:'not-complete',bom:[line()],costs:{bomComplete:false}},
 {id:'wrong-denominator',bom:[line()],costs:{basis:'product_price'}},
 {id:'unconfirmed',bom:[line()],classificationConfirmed:false},
 {id:'maximum-lines',bom:Array.from({length:500},()=>line('1'))}
];
let checks=0;
function compare(sample){
 const input={...base,...sample,costs:{...base.costs,...sample.costs}};delete input.id;
 const assessment=E.empty(entry);assessment.date=input.date;assessment.goal=input.goal;assessment.classification=input.classificationConfirmed;assessment.costs={...assessment.costs,...input.costs};assessment.bom=JSON.parse(JSON.stringify(input.bom));
 const output=A.calculateLocalization(input);
 assert.deepEqual(output.result,E.evaluate(entry,assessment,input.date));checks++;
 assert.deepEqual(output.input.bom,input.bom);checks++;
 assert.notEqual(output.result.status,'ready');checks++;
 return{input,output};
}
const outputs=cases.map(compare);
assert.equal(outputs[0].output.result.shareExact,'10');checks++;
assert.equal(outputs[0].output.result.costStatus,'met');checks++;
assert.equal(outputs[1].output.result.costStatus,'met');checks++;
assert.equal(outputs[2].output.result.costStatus,'failed');checks++;
assert.equal(outputs[3].output.result.share,null);checks++;
assert.equal(outputs[4].output.result.share,null);checks++;
assert.equal(outputs[5].output.result.costStatus,'invalid');checks++;
assert.equal(outputs[12].output.result.blocked,true);checks++;
const invalid=[null,{},[null],['bad'],[{...line(),name:'not in calculation contract'}],
 [{...line(),quantity:1}],[{...line(),originBasis:'x'.repeat(5001)}],
 [{...line(),unitCost:'x'.repeat(121)}],Array.from({length:501},()=>line()),
 [JSON.parse('{"__proto__":"x","quantity":"1","unitCost":"1","currency":"RUB","origin":"rf","originBasis":"synthetic"}')],
 [Object.create(line())],new Array(1)];
for(const bom of invalid){assert.throws(()=>A.calculateLocalization({...base,bom}),/Expected costs.mode=bom/);checks++;}
assert.throws(()=>A.calculateLocalization({...base,bom:[line()],costs:{...base.costs,mode:'totals'}}),/Expected costs.mode=bom/);checks++;
const incoming=[line()];const output=A.calculateLocalization({...base,bom:incoming});output.input.bom[0].origin='changed';output.input.bom.push(line());assert.deepEqual(incoming,[line()]);checks++;
assert.equal(Object.hasOwn(A.calculateLocalization({...base}).input,'bom'),false);checks++;
assert.equal(A.calculateLocalization({...base,costs:{...base.costs,bom:[line()]}}).result.share,null);checks++;
console.log(JSON.stringify({pass:true,api002Checks:checks,directEngineCases:cases.length,syntheticOnly:true,normativeLogicChanged:false}));
module.exports={cases,outputs,base,line};
