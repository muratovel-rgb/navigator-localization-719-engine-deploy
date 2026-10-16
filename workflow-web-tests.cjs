'use strict';
const assert=require('node:assert/strict'),{app,wait,click,fill,submit,data,file,load,localToday}=require('./web-test-harness.cjs');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
function select(a,id,indices){for(const [i,n]of [...a.document.querySelectorAll('#'+id+' input')].entries()){n.checked=indices===true||indices.includes(i);n.dispatchEvent(new a.window.Event('change'));}}
function open(a,id){const d=a.document.getElementById(id);assert.equal(d.tagName,'DETAILS');d.open=true;}
function openParents(a,selector){let n=a.document.querySelector(selector);while(n){if(n.tagName==='DETAILS')n.open=true;n=n.parentNode;}}
(async()=>{
const a=app();click(a,'#portfolio-nav');click(a,'#new-project');fill(a,'#project-name','Synthetic GCV workflow');fill(a,'#project-productName','GCV');fill(a,'#project-okpd2','28.14.13.121');fill(a,'#project-new-variants',Array.from({length:18},(_,i)=>'GCV-'+i).join('\n'));fill(a,'#project-actor','Synthetic reviewer');submit(a,'#project-name');await wait();
test('new workflow sections preserve a compact initial screen',()=>{for(const id of ['workflow-requests','workflow-origins','workflow-packages'])assert(!a.document.getElementById(id).open);});
open(a,'tpp-add-document');fill(a,'#tpp52-actor','Synthetic reviewer');fill(a,'#tpp-doc-title','Manufacturing route');select(a,'tpp-doc-scope',true);file(a,'route.txt','Synthetic route');submit(a,'#tpp-doc-title');await wait();
open(a,'workflow-requests');open(a,'request-add');
for(const [key,value]of Object.entries({title:'Confirm dates',reason:'Dates and batch missing',object:'GCV body',recipientRole:'Supplier',recipient:'Synthetic recipient',owner:'Synthetic owner',dueDate:'2026-11-01'}))fill(a,'#request-'+key,value);
select(a,'request-scope',true);submit(a,'#request-title');await wait();let p=data(a).assessments[0],r=p.tpp52.requests[0];
test('request is created through the HTML form for 18 variants',()=>{assert.equal(r.scope.length,18);assert.equal(r.status,'OPEN');assert.equal(r.recipient,'Synthetic recipient');});
openParents(a,'#request-basis-'+r.id);fill(a,'#request-result-'+r.id,'ACCEPTED');fill(a,'#request-basis-'+r.id,'Checked');select(a,'request-review-evidence-'+r.id,true);submit(a,'#request-basis-'+r.id);await wait();
test('review cannot silently accept an unanswered request',()=>{assert.equal(data(a).assessments[0].tpp52.requests[0].status,'OPEN');assert.match(a.document.getElementById('notice').textContent,/Сначала запиши ответ/);});
openParents(a,'#request-answer-'+r.id);fill(a,'#request-answer-'+r.id,'Synthetic batch records received');select(a,'request-evidence-'+r.id,true);submit(a,'#request-answer-'+r.id);await wait();
test('HTML records receipt separately from review',()=>assert.equal(data(a).assessments[0].tpp52.requests[0].status,'ANSWER_RECEIVED'));
openParents(a,'#request-basis-'+r.id);fill(a,'#request-result-'+r.id,'ACCEPTED');fill(a,'#request-basis-'+r.id,'Current route covers all 18 variants');select(a,'request-review-evidence-'+r.id,true);submit(a,'#request-basis-'+r.id);await wait();
test('HTML stores explicit content review',()=>assert.equal(data(a).assessments[0].tpp52.requests[0].status,'REVIEWED'));
open(a,'workflow-origins');open(a,'origin-add');fill(a,'#origin-label','Synthetic metal');fill(a,'#origin-batch','Heat 1');select(a,'origin-scope',true);select(a,'origin-evidence',true);submit(a,'#origin-label');await wait();p=data(a).assessments[0];const metal=p.tpp52.origins[0].id;
openParents(a,'#origin-basis-'+metal);fill(a,'#origin-status-'+metal,'RUS_RAW_MATERIAL_ONLY');fill(a,'#origin-basis-'+metal,'Passport supports raw material only');select(a,'origin-review-evidence-'+metal,true);submit(a,'#origin-basis-'+metal);await wait();
open(a,'workflow-origins');open(a,'origin-add');fill(a,'#origin-kind','PART');fill(a,'#origin-label','GCV body');fill(a,'#origin-code','28.14.20.000');fill(a,'#origin-batch','Batch 1');select(a,'origin-parents',true);select(a,'origin-scope',true);select(a,'origin-evidence',true);submit(a,'#origin-label');await wait();p=data(a).assessments[0];
test('material and part remain separate objects in UI',()=>{assert.equal(p.tpp52.origins[0].status,'RUS_RAW_MATERIAL_ONLY');assert.equal(p.tpp52.origins[1].status,'COMPONENT_ORIGIN_UNCONFIRMED');assert.deepEqual(p.tpp52.origins[1].parentIds,[metal]);assert.match(a.document.getElementById('origin-record-'+p.tpp52.origins[1].id).textContent,/Код требует проверки/);});
open(a,'workflow-packages');open(a,'package-add');fill(a,'#package-title','Synthetic package');select(a,'package-scope',true);select(a,'package-evidence',true);submit(a,'#package-title');await wait();p=data(a).assessments[0];const pack=p.tpp52.packages[0];
test('HTML freezes document versions and project metadata',()=>{assert.equal(pack.scope.length,18);assert.equal(pack.documents.length,1);assert.equal(pack.projectSnapshot.product.name,'GCV');assert.equal(pack.legalReadiness,'NOT_EVALUATED');});
open(a,'workflow-packages');open(a,'official-add');fill(a,'#official-kind','SUBMITTED');fill(a,'#official-number','TEST-SUBMIT');fill(a,'#official-date',localToday());fill(a,'#official-reference','Synthetic GISP receipt');select(a,'official-scope',[0]);select(a,'official-evidence',true);submit(a,'#official-number');await wait();
test('HTML submission event covers only selected variant',()=>{assert(data(a).assessments[0].tpp52.officialEvents?.length,a.document.getElementById('notice').textContent);assert.equal(data(a).assessments[0].tpp52.officialEvents[0].scope.length,1);});
open(a,'project-card-editor');fill(a,'#project-productName','GCV changed');open(a,'workflow-packages');open(a,'package-add');fill(a,'#package-title','Unsaved metadata');select(a,'package-scope',true);select(a,'package-evidence',true);submit(a,'#package-title');await wait();
test('cannot freeze a package while card edits are unsaved',()=>{assert.equal(data(a).assessments[0].tpp52.packages.length,1);assert.match(a.document.getElementById('notice').textContent,/Сначала сохрани/);});
fill(a,'#project-actor','Synthetic reviewer');submit(a,'#project-name');await wait();p=data(a).assessments[0];
test('metadata edits reopen requests without rewriting frozen content',()=>{assert.equal(p.tpp52.requests[0].status,'REOPENED');assert.equal(p.tpp52.packages[0].projectSnapshot.product.name,'GCV');});
open(a,'workflow-packages');open(a,'package-record-'+pack.id);click(a,'#package-record-'+pack.id+' button');const manifest=JSON.parse(await a.downloads.at(-1).text());
test('package download contains only frozen content of current project',()=>{assert.equal(manifest.assessmentId,p.id);assert.equal(manifest.package.projectSnapshot.product.name,'GCV');assert(!Object.hasOwn(manifest,'assessments'));});
click(a,'#project-export');const exported=JSON.parse(await a.downloads.at(-1).text());const restored=app();click(restored,'#portfolio-nav');await load(restored,exported);click(restored,'#portfolio article button');
test('full workflow survives JSON transfer to another browser store',()=>{const p=data(restored).assessments[0];assert.equal(p.tpp52.requests.length,1);assert.equal(p.tpp52.origins.length,2);assert.equal(p.tpp52.packages.length,1);assert.equal(p.tpp52.officialEvents.length,1);});
const button=[...a.document.querySelectorAll('#tpp52-content button')].find(n=>n.textContent==='Выгрузить статус проекта');button.dispatchEvent(new a.window.Event('click'));const report=await a.downloads.at(-1).text();
test('client status distinguishes submission from registry result',()=>{assert.match(report,/Записано событий подачи: 1/);assert.match(report,/Записано реестровых записей: 0/);assert.match(report,/автоматически не оценивалась/);});
open(a,'tpp-add-document');fill(a,'#tpp-doc-select',p.tpp52.documents[0].id);file(a,'route-new.txt','Synthetic route changed');submit(a,'#tpp-doc-title');await wait();
test('new document version keeps old frozen package unchanged',()=>{const t=data(a).assessments[0].tpp52;assert.equal(t.documents[0].versions.length,2);assert.equal(t.packages[0].documents[0].id,pack.documents[0].id);assert.equal(t.officialEvents[0].kind,'SUBMITTED');});
console.log(JSON.stringify({pass:true,checks,syntheticVariants:18,nativeLayoutVerified:false,actualClientAcceptance:false}));
})().catch(e=>{console.error(e);process.exitCode=1;});
