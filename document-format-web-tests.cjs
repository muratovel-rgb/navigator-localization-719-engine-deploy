'use strict';
const assert=require('node:assert/strict'),{app,wait,click,fill,submit,data,file,load}=require('./web-test-harness.cjs');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function open(a,s){let n=a.document.querySelector(s);assert(n,s);while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentNode;}}
function select(a,id,all=true){for(const [i,n]of [...a.document.querySelectorAll('#'+id+' input')].entries()){n.checked=all||i===0;n.dispatchEvent(new a.window.Event('change'));}}
(async()=>{
 const a=app();click(a,'#portfolio-nav');click(a,'#new-project');for(const [k,v]of Object.entries({name:'Synthetic format test',productName:'Test valve',okpd2:'28.14.13.121','new-variants':'A\nB',actor:'Reviewer'}))fill(a,'#project-'+k,v);submit(a,'#project-name');await wait();
 open(a,'#tpp-add-document');fill(a,'#tpp52-actor','Reviewer');fill(a,'#tpp-doc-title','Form');select(a,'tpp-doc-scope');file(a,'form.pdf','Synthetic scan');submit(a,'#tpp-doc-title');await wait();
 let p=data(a).assessments[0],doc=p.tpp52.documents[0];
 test('HTML stores file identity and displays variant coverage',()=>{assert.equal(doc.versions[0].fileName,'form.pdf');assert.match(a.document.getElementById('document-coverage').textContent,/2 из 2/);});
 open(a,'#request-add');for(const [key,value]of Object.entries({title:'Editable form',reason:'Requested format',object:'Form',recipientRole:'Supplier',recipient:'Synthetic',owner:'Reviewer',dueDate:'2026-11-01'}))fill(a,'#request-'+key,value);fill(a,'#request-format','EDITABLE');select(a,'request-scope');submit(a,'#request-title');await wait();let req=data(a).assessments[0].tpp52.requests[0];
 open(a,'#request-answer-'+req.id);fill(a,'#request-answer-'+req.id,'Scan received');select(a,'request-evidence-'+req.id);submit(a,'#request-answer-'+req.id);await wait();
 open(a,'#request-basis-'+req.id);fill(a,'#request-result-'+req.id,'ACCEPTED');fill(a,'#request-basis-'+req.id,'Checked');select(a,'request-review-evidence-'+req.id);submit(a,'#request-basis-'+req.id);await wait();
 test('HTML blocks acceptance until editability is checked',()=>{assert.equal(data(a).assessments[0].tpp52.requests[0].status,'ANSWER_RECEIVED');assert.match(a.document.getElementById('notice').textContent,/редактируемость/);});
 open(a,'#format-result-'+doc.id);fill(a,'#format-result-'+doc.id,'EDITABLE');fill(a,'#format-basis-'+doc.id,'Opened in editor and changed a test field');submit(a,'#format-basis-'+doc.id);await wait();
 test('format finding belongs to the exact current version',()=>assert.equal(data(a).assessments[0].tpp52.documents[0].versions[0].formatReview.result,'EDITABLE'));
 open(a,'#request-basis-'+req.id);fill(a,'#request-result-'+req.id,'ACCEPTED');fill(a,'#request-basis-'+req.id,'Format and content checked');select(a,'request-review-evidence-'+req.id);submit(a,'#request-basis-'+req.id);await wait();
 test('separate format and content reviews allow explicit acceptance',()=>assert.equal(data(a).assessments[0].tpp52.requests[0].status,'REVIEWED'));
 open(a,'#format-result-'+doc.id);fill(a,'#format-result-'+doc.id,'READ_ONLY');fill(a,'#format-basis-'+doc.id,'Review corrected: image cannot be edited');submit(a,'#format-basis-'+doc.id);await wait();
 test('correcting format review reopens the request',()=>assert.equal(data(a).assessments[0].tpp52.requests[0].status,'REOPENED'));
 open(a,'#tpp-add-document');fill(a,'#tpp-doc-select',doc.id);select(a,'tpp-doc-scope',false);file(a,'form-new.docx','Synthetic editable contents');submit(a,'#tpp-doc-title');await wait();
 test('replacement clears current finding and exposes missing variant',()=>{const versions=data(a).assessments[0].tpp52.documents[0].versions;assert.equal(versions[1].formatReview,undefined);assert.equal(versions[1].fileName,'form-new.docx');assert.match(a.document.getElementById('document-coverage').textContent,/1 из 2/);assert.match(a.document.getElementById('document-coverage').textContent,/B · Нет документов/);});
 click(a,'#project-export');const payload=JSON.parse(await a.downloads.at(-1).text()),restored=app();await load(restored,payload);
 test('import retains format history and request condition',()=>{const state=data(restored).assessments[0].tpp52;assert.equal(state.documents[0].versions[0].formatReview.result,'READ_ONLY');assert.equal(state.requests[0].formatRequirement,'EDITABLE');assert.equal(state.requests[0].status,'REOPENED');});
 console.log(JSON.stringify({pass:true,checks,nativeLayoutVerified:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
