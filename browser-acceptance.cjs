'use strict';
// Optional native-browser acceptance. Uses synthetic data and the local bundle.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright-core');
const out=path.join(__dirname,'dist','browser-qa');fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.join(__dirname,'dist/navigator-719-tpp52-preview.html')).href;
const launch=()=>chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process','--disable-gpu']});
const results=[];
async function run(viewport){
 const browser=await launch(),context=await browser.newContext({viewport,acceptDownloads:true,locale:'ru-RU',timezoneId:'Asia/Ho_Chi_Minh'}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const external=[];await context.route('**/*',route=>{if(/^https?:/.test(route.request().url())){external.push(route.request().url());return route.abort();}return route.continue();});
 let checks=0;
 const check=(name,fn)=>{fn();checks++;console.log('PASS '+viewport.width+' '+name);};
 const open=async selector=>page.locator(selector).evaluate(el=>{for(let n=el;n;n=n.parentElement)if(n.tagName==='DETAILS')n.open=true;});
 const fill=async(selector,value)=>{await open(selector);await page.locator(selector).fill(value);};
 const pick=async(selector,value)=>{await open(selector);await page.locator(selector).selectOption(value);};
 const scope=async(id,all=true)=>{await open('#'+id);const inputs=page.locator('#'+id+' input');for(let i=0;i<await inputs.count();i++)await inputs.nth(i).setChecked(all||i===0);};
 const submit=async selector=>{await open(selector);await page.locator(selector).locator('xpath=ancestor::form').locator('button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('button[type=submit][disabled]'));};
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('localization-prototype-v2')).assessments[0]);
 const noOverflow=async label=>{const dims=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));check(label+' fits viewport',()=>assert(dims.scroll<=dims.width+1,JSON.stringify(dims)));};
 try{
  await page.goto(url);await page.evaluate(()=>localStorage.clear());await page.reload();
  await noOverflow('search');await page.screenshot({path:path.join(out,'search-'+viewport.width+'.png'),fullPage:true});
  await page.locator('#portfolio-nav').click();await page.locator('#new-project').click();
  for(const [k,v]of Object.entries({name:'Учебный GCV',productName:'Клапан GCV',okpd2:'28.14.13.121','new-variants':Array.from({length:18},(_,i)=>'Исполнение '+(i+1)).join('\n'),actor:'Учебный проверяющий'}))await fill('#project-'+k,v);
  await submit('#project-name');let p=await state();check('project has 18 variants',()=>assert.equal(p.variants.length,18));const actionBarVisible=await page.locator('.action-bar').isVisible();check('project has no obstructing calculator action bar',()=>assert.equal(actionBarVisible,false));
  await fill('#tpp52-actor','Учебный проверяющий');await fill('#tpp-doc-title','Маршрут и форма');await scope('tpp-doc-scope');await page.locator('#tpp-doc-file').setInputFiles({name:'form.pdf',mimeType:'application/pdf',buffer:Buffer.from('Synthetic form, no client data')});await submit('#tpp-doc-title');p=await state();const doc=p.tpp52.documents[0];check('native file hashing and save',()=>assert.match(doc.versions[0].checksum,/^[a-f0-9]{64}$/));
  for(const [k,v]of Object.entries({title:'Запрос редактируемой формы',reason:'Нужна проверка содержания',object:'Форма по исполнениям',recipientRole:'Поставщик',recipient:'Учебный адресат',owner:'Учебный ответственный',dueDate:'2026-11-01'}))await fill('#request-'+k,v);
  await pick('#request-format','EDITABLE');await scope('request-scope');await submit('#request-title');p=await state();const q=p.tpp52.requests[0];
  await fill('#request-answer-'+q.id,'Учебный ответ получен');await scope('request-evidence-'+q.id);await submit('#request-answer-'+q.id);
  await pick('#request-result-'+q.id,'ACCEPTED');await fill('#request-basis-'+q.id,'Содержание проверено');await scope('request-review-evidence-'+q.id);await submit('#request-basis-'+q.id);p=await state();check('format gate rejects unchecked file',()=>assert.equal(p.tpp52.requests[0].status,'ANSWER_RECEIVED'));
  await pick('#format-result-'+doc.id,'EDITABLE');await fill('#format-basis-'+doc.id,'Учебная проверка: открыт в редакторе');await submit('#format-basis-'+doc.id);
  await pick('#request-result-'+q.id,'ACCEPTED');await fill('#request-basis-'+q.id,'Проверены формат и содержание');await scope('request-review-evidence-'+q.id);await submit('#request-basis-'+q.id);p=await state();check('explicit review accepts answer',()=>assert.equal(p.tpp52.requests[0].status,'REVIEWED'));
  await fill('#origin-label','Учебный металл');await fill('#origin-batch','Учебная плавка');await scope('origin-scope');await scope('origin-evidence');await submit('#origin-label');p=await state();const metal=p.tpp52.origins[0];
  await pick('#origin-status-'+metal.id,'RUS_RAW_MATERIAL_ONLY');await fill('#origin-basis-'+metal.id,'Паспорт относится только к металлу');await scope('origin-review-evidence-'+metal.id);await submit('#origin-basis-'+metal.id);
  await pick('#origin-kind','PART');await fill('#origin-label','Учебный корпус');await scope('origin-parents');await scope('origin-scope');await scope('origin-evidence');await submit('#origin-label');p=await state();check('material never approves part',()=>{assert.equal(p.tpp52.origins[0].status,'RUS_RAW_MATERIAL_ONLY');assert.equal(p.tpp52.origins[1].status,'COMPONENT_ORIGIN_UNCONFIRMED');});
  await fill('#package-title','Учебный пакет');await scope('package-scope');await scope('package-evidence');await submit('#package-title');p=await state();const frozen=JSON.stringify(p.tpp52.packages[0]);
  await pick('#official-kind','SUBMITTED');await fill('#official-number','TEST-SUBMIT');await fill('#official-date',await page.evaluate(()=>new Date().toLocaleDateString('en-CA')));await fill('#official-reference','Учебное подтверждение отправки');await scope('official-scope',false);await scope('official-evidence');await submit('#official-number');p=await state();check('submission has one variant and no invented act',()=>{assert.equal(p.tpp52.officialEvents.length,1);assert.equal(p.tpp52.officialEvents[0].scope.length,1);assert.equal(p.tpp52.officialEvents[0].kind,'SUBMITTED');});
  // Capture the saved card with all task forms collapsed as on a fresh render.
  await page.evaluate(()=>{for(const d of document.querySelectorAll('#project-page details'))d.open=false;});await page.evaluate(()=>scrollTo(0,0));await noOverflow('project');await page.screenshot({path:path.join(out,'project-'+viewport.width+'.png'),fullPage:true});
  await open('#origin-record-'+p.tpp52.origins[1].id);await noOverflow('origin');await page.screenshot({path:path.join(out,'origin-'+viewport.width+'.png'),fullPage:true});
  await pick('#tpp-doc-select',doc.id);await page.locator('#tpp-doc-file').setInputFiles({name:'form-new.docx',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',buffer:Buffer.from('Synthetic replacement')});await submit('#tpp-doc-title');p=await state();
  check('replacement reopens current work and retains submitted snapshot',()=>{assert.equal(p.tpp52.requests[0].status,'REOPENED');assert.equal(p.tpp52.origins[1].status,'LEGAL_REVIEW_REQUIRED');assert.equal(JSON.stringify(p.tpp52.packages[0]),frozen);assert.equal(p.tpp52.documents[0].versions[1].formatReview,undefined);});
  const downloadPromise=page.waitForEvent('download');await page.locator('#project-export').click();const download=await downloadPromise;const exported=JSON.parse(fs.readFileSync(await download.path(),'utf8'));check('download contains current project only',()=>{assert.equal(exported.assessments.length,1);assert.equal(exported.assessments[0].id,p.id);});
  await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#portfolio-nav').click();await page.locator('#import-file').setInputFiles({name:'project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>JSON.parse(localStorage.getItem('localization-prototype-v2'))?.assessments?.length===1);p=await state();check('JSON restores full workflow and exact package',()=>{assert.equal(JSON.stringify(p.tpp52.packages[0]),frozen);assert.equal(p.tpp52.requests[0].formatRequirement,'EDITABLE');assert.equal(p.tpp52.documents[0].versions.length,2);});
  check('no script errors or external data requests',()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
  results.push({viewport,checks,passed:true});
 }finally{await browser.close();}
}
(async()=>{await run({width:1440,height:1000});await run({width:390,height:844});fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,checkedAt:new Date().toISOString(),results,syntheticOnly:true,legalAcceptance:false},null,2)+'\n');console.log(JSON.stringify({pass:true,results}));})().catch(e=>{console.error(e);process.exitCode=1;});
