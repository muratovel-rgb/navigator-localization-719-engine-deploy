(function(root){
'use strict';
const fail=(ok,msg)=>{if(!ok)throw Error(msg);},abort=signal=>{if(signal?.aborted)throw Error('Чтение отменено. Файл не загружен.');};
const nodes=(doc,name)=>{const out=[];function visit(e){if(e.nodeType===1&&(e.localName||e.nodeName).split(':').pop()===name)out.push(e);for(const c of e.childNodes||[])visit(c);}visit(doc);return out;};
const children=(doc,name)=>[...doc.childNodes].filter(e=>e.nodeType===1&&(e.localName||e.nodeName).split(':').pop()===name);
function xml(text,parse){fail(text.length<=2000000&&!/<!DOCTYPE|<!ENTITY/i.test(text),'XML слишком большой или содержит внешние определения');const doc=parse(text);fail(!nodes(doc,'parsererror').length,'Повреждён XML документа');return doc;}
function officeText(node){let out='';function walk(e){const k=(e.localName||e.nodeName||'').split(':').pop();if(k==='t')out+=e.textContent;else if(k==='tab')out+='\t';else if(k==='br'||k==='cr')out+='\n';else for(const c of e.childNodes||[])if(c.nodeType===1)walk(c);}walk(node);return out;}
function budget(pages){let count=0;for(const p of pages){fail(p.text.length<=100000,'Один раздел или лист содержит больше 100 000 символов');count+=new TextEncoder().encode(p.text).length;}fail(count<=900000&&pages.length<=1000,'Слишком много текста для одного документа');return pages;}
async function office(bytes,extension,{Zip,parseXml,signal}){
 fail(Zip&&parseXml,'Средство чтения Office не загружено');const zip=await Zip.loadAsync(bytes,{createFolders:false});abort(signal);
 const files=Object.values(zip.files).filter(f=>!f.dir);fail(files.length<=5000,'В архиве Office слишком много частей');let expanded=0;
 for(const f of files){const size=f._data?.uncompressedSize;fail(Number.isFinite(size)&&size>=0&&size<=10000000,'Часть архива Office слишком велика');expanded+=size;fail(expanded<=50000000,'Распакованный Office больше 50 МБ');}
 const read=async path=>{abort(signal);const file=zip.file(path);fail(file,'Часть документа не найдена: '+path);fail(file._data.uncompressedSize<=2000000,'XML больше 2 МБ');const raw=await new Promise((resolve,reject)=>{const stream=file.internalStream('uint8array'),parts=[];let size=0,finished=false;const stop=error=>{if(finished)return;finished=true;stream.pause();reject(error);};stream.on('data',chunk=>{try{abort(signal);size+=chunk.length;if(size>2000000)return stop(Error('XML больше 2 МБ после распаковки'));parts.push(chunk);}catch(e){stop(e);}}).on('error',stop).on('end',()=>{if(finished)return;finished=true;const joined=new Uint8Array(size);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}try{resolve(new TextDecoder('utf-8',{fatal:true}).decode(joined));}catch(e){reject(e);}});stream.resume();});return xml(raw,parseXml);};
 const pages=[];
 if(extension==='docx'){
  const paths=['word/document.xml',...files.map(f=>f.name).filter(s=>/^word\/(header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(s)).sort()];
  for(const path of paths){const d=await read(path),text=nodes(d,'p').map(officeText).join('\n');pages.push({page:pages.length+1,text,unitType:'DOCUMENT_PART',label:path==='word/document.xml'?'Основной текст':path,method:'OOXML'});}
  return {method:'DOCX_XML',pages:budget(pages)};
 }
 if(extension==='xlsx'){
  const workbook=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels'),relationships=new Map(nodes(rels,'Relationship').map(e=>[e.getAttribute('Id'),e]));let strings=[];
  if(zip.file('xl/sharedStrings.xml'))strings=nodes(await read('xl/sharedStrings.xml'),'si').map(e=>nodes(e,'t').map(t=>t.textContent).join(''));
  for(const sheet of nodes(workbook,'sheet')){abort(signal);const relation=relationships.get(sheet.getAttribute('r:id')||sheet.getAttributeNS?.('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id'));fail(relation&&relation.getAttribute('TargetMode')!=='External','Внешняя ссылка вместо листа не читается');
   let target=relation.getAttribute('Target');fail(target&&!target.includes('..')&&!/^[a-z]+:/i.test(target),'Недопустимый путь листа');target=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
   const d=await read(target),lines=[];for(const cell of nodes(d,'c')){const ref=cell.getAttribute('r')||'?',type=cell.getAttribute('t'),v=children(cell,'v')[0]?.textContent||'',formula=children(cell,'f')[0]?.textContent;let value=type==='s'?strings[Number(v)]??'[нет общей строки]':type==='inlineStr'?nodes(cell,'t').map(t=>t.textContent).join(''):type==='b'?(v==='1'?'TRUE':'FALSE'):v;lines.push(ref+': '+value+(formula!==undefined?' [формула: '+formula+'; сохранённый результат, не пересчитан]':''));}
   pages.push({page:pages.length+1,text:lines.join('\n'),unitType:'WORKSHEET',label:sheet.getAttribute('name')||'Лист '+(pages.length+1),method:'OOXML'});
  }
  return {method:'XLSX_XML',pages:budget(pages)};
 }
 if(extension==='pptx'){
  const paths=files.map(f=>f.name).filter(s=>/^ppt\/slides\/slide\d+\.xml$/.test(s)).sort((a,b)=>Number(a.match(/slide(\d+)/)[1])-Number(b.match(/slide(\d+)/)[1]));fail(paths.length,'Слайды не найдены');
  for(const path of paths){const d=await read(path);pages.push({page:pages.length+1,text:nodes(d,'p').map(officeText).join('\n'),unitType:'SLIDE',label:'Слайд '+path.match(/slide(\d+)/)[1],method:'OOXML'});}return {method:'PPTX_XML',pages:budget(pages)};
 }
 throw Error('Этот формат Office не поддерживается');
}
async function pdf(bytes,{pdfjs,ocr,createCanvas,onProgress=()=>{},signal,forceOcr=false}){
 const doc=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true}).promise;let usedOcr=false;
 try{fail(doc.numPages<=1000,'PDF содержит больше 1000 страниц');const pages=[];
  for(let i=1;i<=doc.numPages;i++){abort(signal);onProgress('Чтение страницы '+i+' / '+doc.numPages);const p=await doc.getPage(i);try{
   const content=await p.getTextContent();let text=content.items.map(x=>(x.str||'')+(x.hasEOL?'\n':' ')).join(''),method='PDF_TEXT',confidence;
   if(ocr&&(forceOcr||(text.match(/[\p{L}\p{N}]/gu)||[]).length<50)){
    const native=p.getViewport({scale:1}),scale=Math.min(2.3,2400/Math.max(native.width,native.height)),viewport=p.getViewport({scale}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    try{await p.render({canvasContext:canvas.getContext('2d'),canvas,viewport}).promise;abort(signal);const result=await ocr(canvas,i,doc.numPages);text=result.text;confidence=result.confidence;method='OCR';usedOcr=true;}finally{canvas.width=canvas.height=0;}
   }
   const result={page:i,text,unitType:'PDF_PAGE',label:'Страница '+i,method};if(Number.isFinite(confidence))result.confidence=confidence;pages.push(result);budget(pages);
  }finally{p.cleanup();}}
  return {method:usedOcr?'PDF_OCR':'PDF_TEXT',pages};
 }finally{await doc.destroy();}
}
const api={office,pdf,budget,abort};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NavigatorDocumentReader=api;
})(globalThis);
