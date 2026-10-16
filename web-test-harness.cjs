'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const {parseHTML}=require(require.resolve('linkedom',{paths:[process.env.DOM_MODULES||__dirname]}));
const clone=x=>JSON.parse(JSON.stringify(x));
function app(stored){
 const html=fs.readFileSync(path.join(__dirname,'dist/navigator-719-tpp52-preview.html'),'utf8'),{window,document}=parseHTML(html);
 const descriptor=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value');
 if(!descriptor.set)Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){const o=this.querySelector('option[selected]')||this.options[0];return o?(o.getAttribute('value')??o.textContent):'';},set(v){for(const o of this.options)o.removeAttribute('selected');const option=[...this.options].find(o=>(o.getAttribute('value')??o.textContent)===String(v));if(option)option.setAttribute('selected','');}});
 const storage=new Map(stored||[]),downloads=[];let failStorage=false;
 window.matchMedia=()=>({matches:true});window.print=()=>{};window.HTMLAnchorElement.prototype.click=function(){};window.HTMLElement.prototype.scrollIntoView=function(){};
 for(const d of document.querySelectorAll('dialog')){d.showModal=()=>d.setAttribute('open','');d.close=()=>{d.removeAttribute('open');d.dispatchEvent(new window.Event('close'));};}
 const URLMock={createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL:()=>{}};
 const context=vm.createContext({document,window,crypto:webcrypto,TextEncoder,Uint8Array,Blob,URL:URLMock,setTimeout,console,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(failStorage)throw Error('Storage quota');storage.set(k,v);}}});
 for(const s of document.querySelectorAll('script'))vm.runInContext(s.textContent,context);
 return {window,document,context,storage,downloads,failStorage:v=>{failStorage=v;}};
}
const wait=()=>new Promise(r=>setTimeout(r,40));
const click=(a,s)=>{const n=a.document.querySelector(s);assert(n,'missing '+s);n.dispatchEvent(new a.window.Event('click'));};
const fill=(a,s,v)=>{const n=a.document.querySelector(s);assert(n,'missing '+s);n.value=v;n.dispatchEvent(new a.window.Event(n.tagName==='SELECT'?'change':'input'));};
const submit=(a,s)=>a.document.querySelector(s).closest('form').dispatchEvent(new a.window.Event('submit',{cancelable:true}));
const data=a=>JSON.parse(a.storage.get('localization-prototype-v2'));
const load=async(a,payload)=>{const input=a.document.getElementById('import-file');Object.defineProperty(input,'files',{configurable:true,value:[{size:2000,text:async()=>JSON.stringify(payload)}]});input.dispatchEvent(new a.window.Event('change'));await wait();};
const file=(a,name,text)=>Object.defineProperty(a.document.querySelector('#tpp-doc-file'),'files',{configurable:true,value:[{name,size:text.length,arrayBuffer:async()=>new TextEncoder().encode(text).buffer}]});
const localToday=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

module.exports={app,wait,click,fill,submit,data,load,file,clone,localToday};
