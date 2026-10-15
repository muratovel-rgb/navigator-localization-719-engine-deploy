'use strict';
const data=require('./pp719-index.json');
const normalize=s=>String(s||'').toLowerCase().replace(/ё/g,'е').trim();
const byId=new Map(data.positions.map(p=>[p.id,p]));
function search(query){
 const q=normalize(query),numeric=/^[\d.\s]+$/.test(q),digits=q.replace(/\D/g,'');
 if(!q)throw Error('A non-empty query is required');
 return data.positions.filter(p=>numeric?p.codes.some(c=>{const d=c.replace(/\D/g,'');return d.startsWith(digits)||digits.startsWith(d);}):q.split(/\s+/).every(t=>normalize(p.title+' '+p.codeText).includes(t)));
}
function unresolved(p){return {id:p.id,code:p.codeText,title:p.title,method:'unresolved',version:data.version,source:p.source,criteria:[],scope:p.sectionTitle,review:'Найден текст индексной позиции. Применимость, контекст и вычислимое правило требуют проверки.'};}
function metadata(){return {indexVersion:data.version,indexedPositions:data.positions.length,indexedSections:data.sections.length,indexAssembledAt:data.assembledAt,fullLegalCoverageVerified:data.fullLegalCoverageVerified,coverageNote:data.coverageNote};}
module.exports={data,search,byId,unresolved,metadata};
