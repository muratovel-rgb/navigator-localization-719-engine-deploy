'use strict';
const assert=require('node:assert/strict');
const I=require('./legal-index.cjs');
// A footnote <11> is not a code. Actual codeText 11 would still be valid.
const old=I.data.positions[0];
const fixtures=[
 {id:'fixture-note',codeText:'20.16.10.110 <11>',codes:['20.16.10.110','11'],title:'Synthetic note'},
 {id:'fixture-parent',codeText:'Из 20',codes:['20'],title:'Synthetic parent'},
 {id:'fixture-real',codeText:'11',codes:['11'],title:'Synthetic actual code'}
];
I.data.positions.push(...fixtures);
try{
 const eleven=I.search('11').map(p=>p.id);
 assert(!eleven.includes('fixture-note'));
 assert(eleven.includes('fixture-real'));
 assert(I.search('20.16.10.110').some(p=>p.id==='fixture-note'));
 assert(I.search('20.99.99').some(p=>p.id==='fixture-parent'));
 assert.deepEqual(fixtures[0].codes,['20.16.10.110','11']);
 assert.equal(I.data.positions[0],old);
 console.log(JSON.stringify({pass:true,checks:6,rawIndexPreserved:true}));
}finally{I.data.positions.splice(-fixtures.length);}
