'use strict';
const {app,wait,click,clone}=require('./web-test-harness.cjs'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),P=require('./project-records.cjs');
(async()=>{
 const fields={name:'Synthetic shared project',date:'2026-10-16',target:'2026-11-01',manufacturer:'Test',notes:'',product:{name:'Synthetic',okpd2:'',designation:'',tu:'',purpose:'',characteristics:''},variants:[{id:'v1',label:'One'}],positions:[]};
 const project=P.create('shared-test',fields,{id:'first',at:'2026-10-16T00:00:00.000Z',actor:'Test'}),local={formatVersion:2,assessments:[project],history:[],legacyImports:[]};
 const newer=P.update(project,{...fields,notes:'Newer remote state'},{id:'second',at:'2026-10-16T00:00:01.000Z',actor:'Other participant'}),remote={formatVersion:2,assessments:[newer],history:[],importArchive:[]};
 const a=app([['localization-prototype-v2',JSON.stringify(local)]]);a.context.NavigatorWorkspace.open(project.id);
 assert(a.context.NavigatorReports.lines(a.context.NavigatorWorkspace.current()).includes('Юридическая готовность не установлена'));
 const calls=[];a.context.NAVIGATOR_HOSTED=true;a.context.fetch=async(_url,options)=>{const p=JSON.parse(options.body);calls.push(p);const replies={list:[{id:project.id,name:project.name,revision:2}],get:{id:project.id,payload:remote,revision:2,updated_at:'2026-10-16T00:00:01Z'},documents:[],proposals:[],history:[]};return {ok:p.action!=='save',status:p.action==='save'?409:200,json:async()=>p.action==='save'?{error:'Synthetic stale-write conflict'}:replies[p.action]};};
 vm.runInContext(fs.readFileSync(__dirname+'/web/workspace-ui.js','utf8'),a.context);
 const find=t=>[...a.document.querySelectorAll('#online-workspace button')].find(b=>b.textContent.startsWith(t));
 find('Обновить список').dispatchEvent(new a.window.Event('click'));await wait();find(project.name).dispatchEvent(new a.window.Event('click'));await wait();
 find('Сохранить открытый').dispatchEvent(new a.window.Event('click'));await wait();
 assert.equal(calls.find(x=>x.action==='save').revision,0,'Merely viewing a newer cloud revision must not adopt it as local base');
 assert.equal(a.context.NavigatorWorkspace.current().assessments[0].notes,'');assert(a.document.querySelector('#online-workspace [role=status]').textContent.includes('conflict'));
 find('Загрузить эту версию').dispatchEvent(new a.window.Event('click'));await wait();assert(a.document.querySelector('#import-dialog').hasAttribute('open'),'Divergent import must ask which working copy to retain');
 assert.equal(a.context.NavigatorWorkspace.current().assessments[0].notes,'','Opening import conflict never discards local edits');
 console.log(JSON.stringify({pass:true,checks:6,hostedDom:true,nativeLayoutVerified:false}));
})().catch(e=>{console.error(e);process.exit(1);});
