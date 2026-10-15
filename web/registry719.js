(function(g){
  'use strict';
  const D=typeof module!=='undefined'&&module.exports?require('../pp719-index.json'):g.PP719IndexData;
  const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').trim();
  function search(query,section=''){
    const q=norm(query),digits=q.replace(/\D/g,'');
    return D.positions.filter(p=>(!section||p.section===section)&&(!q||(/^[\d.\s]+$/.test(q)?p.codes.some(c=>{const d=c.replace(/\D/g,'');return d.startsWith(digits)||digits.startsWith(d);}):q.split(/\s+/).every(t=>norm(p.title+' '+p.codeText).includes(t)))));
  }
  function stats(){return {sections:D.sections.length,indexed:D.positions.length,newCalculations:D.positions.filter(p=>p.entryId).length,totalCalculations:D.positions.filter(p=>p.entryId).length+2,fullCoverageVerified:D.fullLegalCoverageVerified};}
  const api={search,stats,data:D};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  g.Registry719=api;
  const $=id=>document.getElementById(id),el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  function link(label,url){const a=el('a',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
  function show(p,openEntry){
    const box=$('index719-body');box.replaceChildren();$('index719-title').textContent=p.title;
    box.append(el('p',p.codeText+' · '+p.sectionTitle,'small'),el('p',p.entryId?'Расчёт операций подключён; границы проверки указаны в карточке.':'Найден текст позиции. Вычислимое правило и даты применения ещё не проверены.','banner'));
    if(p.codeInherited)box.append(el('p','Код восстановлен из предшествующей строки общей группы; границы группы требуют сверки.','banner'));
    if(p.textNeedsContext)box.append(el('p','В этой строке источник не повторяет общий текст требований. Нужно сверить объединённую группу по ссылке ниже.','banner'));
    box.append(el('p','Ни совпадение кода, ни наличие строки в этом индексе сами по себе не подтверждают применимость.','small'));
    const body=el('div',p.text||'Открой источник и проверь общую группу требований.','norm-text');box.append(body);
    if(p.editorialNotes.length){const notes=el('details');notes.append(el('summary','Сведения о редакции из источника'),el('p',p.editorialNotes.join('\n'),'small'));box.append(notes);}
    box.append(link('Открыть строку и её контекст в источнике',p.source),el('p','Снимок этой строки: '+p.sourceSnapshotDate+'. Полнота и официальная цепочка изменений всего перечня не подтверждены.','small'));
    if(p.entryId){const b=el('button','Открыть оценку производства','primary');b.onclick=()=>{$('index719-dialog').close();openEntry(p.entryId);};box.append(b);}
    $('index719-dialog').showModal();
  }
  function renderResults(query,box,openEntry){
    const all=search(query),pending=all.filter(p=>!p.entryId&&!((p.section==='XIX'&&p.codes.includes('28.13.13'))||(p.section==='XXVI'&&p.title.includes('типов BB1'))));
    const details=el('details',undefined,'panel');details.open=!!query.trim();details.append(el('summary','Реестр №719 · '+all.length+' строк по запросу'));
    details.append(el('p',query.trim()?'При совпадении нескольких строк уточни назначение, конструкцию и принцип действия. Общая группа кода и специальные позиции показаны отдельно.':'Ищи по коду или названию. Ниже первые строки индекса; расчёт подключён только для обозначенных выше ветвей.','small'));
    const list=el('div');details.append(list);let visible=0;
    const more=el('button','Показать ещё');
    function append(){for(const p of pending.slice(visible,visible+20)){const c=el('article',undefined,'result'),text=el('div');text.append(el('p',p.codeText+' · раздел '+p.section,'small'),el('h3',p.title),el('p','Текст найден · расчёт не подключён'+(p.textNeedsContext?' · общая группа требует сверки':''),'small'));const b=el('button','Посмотреть требования');b.onclick=()=>show(p,openEntry);c.append(text,b);list.append(c);}visible+=20;more.hidden=visible>=pending.length;}
    more.onclick=append;details.append(more);append();
    if(!all.length)details.append(el('p','Совпадений в загруженном индексе нет. Полнота перечня не подтверждена: отсутствие строки не означает отсутствие требований и не назначает СТ-1.','banner'));
    box.append(details);
  }
  function mount(){
    $('close-index719').onclick=()=>$('index719-dialog').close();
    const box=$('coverage719');box.replaceChildren();
    box.append(el('p',D.sections.length+' разделов · '+D.positions.length+' извлечённых строк · '+stats().totalCalculations+' расчётных ветвей. Из них '+stats().newCalculations+' ветвей измерительных приборов. Полнота всего перечня пока не подтверждена.','banner'));
    const table=el('table'),head=el('tr');for(const h of ['Раздел','Строк в индексе','Расчёт'])head.append(el('th',h));const thead=el('thead');thead.append(head);table.append(thead);const tbody=el('tbody');
    for(const section of D.sections){const tr=el('tr');tr.append(el('td',section.title),el('td',String(section.indexed)),el('td',section.id==='XXII'?stats().newCalculations+' ветвей; пороги по цели':section.id==='XIX'?'1 ветвь':section.id==='XXVI'?'1 ветвь (отдельный насос)':'Не подключён'));tbody.append(tr);}table.append(tbody);box.append(table,el('p',D.coverageNote,'small'),el('p','Требуют сверки: '+D.positions.filter(p=>p.textNeedsContext).length+' строк с общим контекстом; '+D.positions.filter(p=>p.codeInherited).length+' строк с унаследованным кодом. Периоды действия всего индекса ещё не проверены. Повторяющиеся названия не объединяются автоматически.','small'));
  }
  g.Registry719UI={mount,renderResults,show};
})(globalThis);
