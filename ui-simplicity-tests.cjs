'use strict';
const assert=require('node:assert/strict');
const {app,click,fill,submit,wait,data}=require('./web-test-harness.cjs');
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
// Linkedom has no native details activation: model that browser action explicitly.
function expand(a,id){const d=a.document.getElementById(id);assert.equal(d.tagName,'DETAILS');assert(d.querySelector('summary'));d.open=true;return d;}
(async()=>{
 const a=app();
 test('initial search keeps calculation catalogue collapsed',()=>assert(!a.document.getElementById('prepared-calculations').open));
 expand(a,'prepared-calculations');
 test('all 11 catalogue cards remain accessible',()=>assert.equal(a.document.querySelectorAll('#prepared-calculations article').length,11));
 click(a,'#portfolio-nav');click(a,'#new-project');
 test('new card opens only basic fields and variants',()=>{assert(a.document.getElementById('project-card-editor').open);assert(a.document.getElementById('project-variants').open);assert(!a.document.getElementById('project-additional').open);assert(!a.document.getElementById('project-positions').open);});
 fill(a,'#project-name','UI test');fill(a,'#project-productName','Учебное изделие');fill(a,'#project-new-variants','А\nБ');fill(a,'#project-actor','Synthetic UI reviewer');submit(a,'#project-name');await wait();
 test('saved project focuses on dossier and preserves metadata',()=>{assert(!a.document.getElementById('project-card-editor').open);assert(a.document.getElementById('tpp52-panel').open);assert.equal(data(a).assessments[0].variants.length,2);});
 test('document and remark forms start collapsed',()=>{assert(!a.document.getElementById('tpp-add-document').open);assert(!a.document.getElementById('tpp-add-remark').open);});
 expand(a,'tpp-add-document');
 test('scope selector shows zero selected and never silently picks variants',()=>{const d=a.document.getElementById('tpp-doc-scope').parentNode;assert(!d.open);assert.match(d.querySelector('summary').textContent,/выбрано: 0 из 2|выбрано: 0$/);d.open=true;const i=d.querySelector('input');i.checked=true;i.dispatchEvent(new a.window.Event('change'));assert.match(d.querySelector('summary').textContent,/выбрано: 1 из 2/);});
 expand(a,'project-card-editor');expand(a,'project-additional');fill(a,'#project-manufacturer','Synthetic maker');fill(a,'#project-actor','Synthetic UI reviewer');submit(a,'#project-name');await wait();
 test('advanced fields remain editable and saved through the same record',()=>assert.equal(data(a).assessments[0].manufacturer,'Synthetic maker'));
 console.log(JSON.stringify({pass:true,checks,nativeLayoutVerified:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
