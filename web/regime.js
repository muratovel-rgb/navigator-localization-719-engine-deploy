(function(root){
 'use strict';
 const D=root.NationalRegimeData||(typeof require==='function'?(require('./regime-data.js'),root.NationalRegimeData):null);
 const clone=x=>JSON.parse(JSON.stringify(x));
 const normalize=s=>String(s||'').trim().toLowerCase().replace(/ё/g,'е');
 const goodDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&!isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const codeValid=s=>/^(?:\d{2}|\d{2}\.\d{1,2}|\d{2}\.\d{2}\.\d{1,2}|\d{2}\.\d{2}\.\d{2}\.\d{3})$/.test(s||'');
 const within=(code,parent)=>String(code).replace(/\./g,'').startsWith(String(parent).replace(/\./g,''));
 const active=(r,date)=>r.validFrom<=date&&(!r.validTo||date<r.validTo);
 const byId=id=>D.rows.find(r=>r.id===id);
 const matches=(r,code)=>r.codes.some(c=>within(code,c));
 function search(q,date=D.asOf){
  const t=normalize(q),numeric=/^[\d. ]+$/.test(t);if(!t)return [];
  return D.rows.filter(r=>r.annex<4&&(numeric?r.codes.some(c=>within(t,c)||within(c,t)):t.split(/\s+/).every(w=>normalize(r.name).includes(w))))
   .map(r=>({...r,active:active(r,date),matchKind:numeric&&matches(r,t)?'code':'candidate'}));
 }
 function empty(code=''){return {code,name:'',date:D.asOf,law:'223',customer:'unknown',purpose:'ordinary',specialCustomer:'unknown',opk:'unknown',object:'goods',procedure:'unknown',origin:'unknown',evidence:'none',evidenceReference:'',evidenceDate:'',registryNumber:'',registryValidUntil:'',registryPoints:'unknown',registryLevel:'unknown',registryRecordDate:'',otherEaeuBid:'unknown',foreignBid:'unknown',allEaeu:'unknown',lot:'unknown',medical:'unknown',medicalCode:'',selections:{},exceptions:[],exceptionReview:'unknown',amount:'',unitMax:'',quantity:'',decision:'',title:''};}
 function normalizeInput(p){return {...empty(),...clone(p||{}),selections:{...(p?.selections||{})},exceptions:clone(p?.exceptions||[])};}
 const tri=x=>['yes','no','unknown'].includes(x);
 function valid(p){return !!p&&typeof p==='object'&&Object.keys(empty()).filter(k=>!['selections','exceptions'].includes(k)).every(k=>typeof p[k]==='string'&&p[k].length<=3000)&&tri(p.registryPoints)&&['unknown','not_required','first','second'].includes(p.registryLevel)&&codeValid(p.code)&&goodDate(p.date)&&['44','223'].includes(p.law)&&['unknown','covered','other'].includes(p.customer)&&['ordinary','atomic','goz','kii','sovereignty','unknown'].includes(p.purpose)&&tri(p.specialCustomer)&&tri(p.opk)&&['goods','software','services','mixed'].includes(p.object)&&['unknown','competitive','single'].includes(p.procedure)&&['unknown','rf','eaeu','foreign'].includes(p.origin)&&['none','registry_rf','registry_eaeu','st1','declaration','software_rf','software_eaeu'].includes(p.evidence)&&tri(p.otherEaeuBid)&&tri(p.foreignBid)&&tri(p.allEaeu)&&tri(p.medical)&&['unknown','single_item','mixed'].includes(p.lot)&&p.selections&&Object.entries(p.selections).every(([id,v])=>byId(id)&&['yes','no','unknown'].includes(v))&&Array.isArray(p.exceptions)&&p.exceptions.length<=30&&p.exceptions.every(x=>x&&typeof x.id==='string'&&x.id.length<30&&typeof x.basis==='string'&&x.basis.length<=3000&&typeof x.documents==='boolean')&&['unknown','none','selected'].includes(p.exceptionReview)&&JSON.stringify(p).length<100000;}
 const card=(state,text,reason,refs=[])=>({state,text,reason,refs});
 const ref=r=>r.locator;
 const inNumbers=(n,list)=>list.split(',').some(s=>{let [a,b]=s.split('-').map(Number);return n>=a&&n<=(b??a);});
 const rubles=s=>{const t=String(s||'').trim().replace(',','.');if(!/^\d+(?:\.\d{1,2})?$/.test(t))return null;const[a,b='']=t.split('.');return BigInt(a)*100n+BigInt(b.padEnd(2,'0'));};
 const exceptionTitles={
 '4и':'Общие исключения: договор, изготовление, СПИК, деятельность за рубежом',
 '4к':'Аптечная организация: розничная торговля по 223-ФЗ',
 '4о':'ПО и сведения, составляющие государственную тайну',
 '5а':'Разрешение Минпромторга на закупку иностранного товара',
 '5б':'Специальный заказчик / ГОЗ: отсутствие производства или реестровой позиции',
 '5в':'Поставка по договору с разрешением Минпромторга',
 '5г':'Закупка за пределами РФ по 223-ФЗ с согласованиями',
 '5д':'Закупка предмета лизинга лизингодателем',
 '5е':'ПО: в реестрах отсутствует нужный класс',
 '5ж':'ПО: реестровые продукты не отвечают характеристикам',
 '5з':'Одна штука, цена закупки до 300 тыс. ₽',
 '5и':'Стоимостное исключение: 300 тыс. / 1 млн ₽',
 '5к':'Подшипник: одна штука до 3 тыс. ₽',
 '5л':'Подшипники: закупка до 30 тыс. ₽, единица до 3 тыс. ₽',
 '5м':'Совместимость товара определённого товарного знака',
 '5н':'Неотложная помощь, авария и другие специальные обстоятельства',
 '5о':'Специальные федеральные органы и их организации',
 '5п':'Закупки ФСО для государственной охраны',
 '5р':'МВД: транспорт для специальных целей',
 '5с':'ФСИН: транспорт для оперативных мероприятий',
 '5т':'ГУСП и подведомственные организации',
 '5у':'Управление делами Президента и его организации',
 '5ф':'Специальный заказчик: запасные части по технической документации',
 '6а':'Ограничение: совместимость определённого товарного знака',
 '6б':'Ограничение: запасные части и расходные материалы по ТД',
 '6в':'Спорт высших достижений: позиции 100 и 101',
 '6г':'Детали к иностранному спортивному оружию',
 '10м':'Заказчик в реестре ОПК, закупка до конца 2026 года'
 };
 const exceptions=Object.entries(exceptionTitles).map(([id,title])=>({id,title,text:D.clauses.find(c=>c.id===id)?.text||'',source:D.sourceURLs.main}));
 function exceptionResult(p,selected){
  const out={ban:false,restriction:false,advantage:false,notes:[],pending:false};
  const b=selected.filter(r=>r.annex===1),n=b.map(r=>Number(r.position));
  for(const ex of p.exceptions){
   let applies=false,scope=ex.id.startsWith('5')?['ban']:ex.id.startsWith('6')?['restriction']:['ban','restriction','advantage'];
   if(!exceptions.some(x=>x.id===ex.id)||!ex.basis.trim()||!ex.documents){out.pending=true;out.notes.push(ex.id+': нужно основание и документы.');continue;}
   const hasBan=b.length>0,amount=rubles(p.amount),unit=rubles(p.unitMax),qty=/^\d+$/.test(p.quantity)?Number(p.quantity):NaN,money=amount!==null;
   if(ex.id==='5з')applies=hasBan&&n.every(x=>!inNumbers(x,'1-7,17,21,27,35,140,141,144,146'))&&money&&qty===1&&amount<=30000000n;
   else if(ex.id==='5и')applies=hasBan&&n.every(x=>!inNumbers(x,'1-7,17,18,21,27,30,35,140,141,144,146'))&&b.every(x=>!['28(1)','30(1)','30(2)','31(1)'].includes(x.position))&&money&&amount<=100000000n&&unit!==null&&unit<=30000000n;
   else if(ex.id==='5к')applies=hasBan&&b.every(x=>x.position==='35')&&money&&qty===1&&amount<=300000n;
   else if(ex.id==='5л')applies=hasBan&&b.every(x=>x.position==='35')&&money&&amount<=3000000n&&unit!==null&&unit<=300000n;
   // Only four numerically checkable exceptions are automated. All others remain visible, with their full legal text.
   else {out.pending=true;out.notes.push(ex.id+': основание сохранено; применимость требует проверки по полному тексту.');continue;}
   if(applies&&p.lot==='single_item'){for(const s of scope)out[s]=true;out.notes.push(ex.id+': числовые условия выполнены; учтено по заявленному решению заказчика.');}
   else {out.pending=true;out.notes.push(ex.id+': не подтверждены числовые условия, состав лота или перечень исключённых позиций.');}
  }
  return out;
 }
 function origin(p,selected){
  const result={state:'unknown',reason:'Укажи происхождение и сведения для его подтверждения.',route:'',notes:[]};
  const software=selected.some(r=>r.annex===1&&r.position==='146'),industrial=selected.some(r=>r.annex===3||(r.annex===1&&Number(r.position.split('(')[0])<=145)||(r.annex===2&&Number(r.position.split('(')[0])<=433));
  const fish=selected.some(r=>r.annex===1&&Number(r.position)>=152),newMedical=selected.some(r=>r.annex===2&&/^388\([123]\)$/.test(r.position));
  result.route=software?'Номер записи в реестре российского или евразийского ПО; п.3 г–ж.':industrial?'Номер записи РРПП / евразийского реестра, закупочные баллы при их наличии и уровень радиоэлектроники; п.3 а, б.':'Наименование страны происхождения; п.3 з. Для отдельных товаров действуют дополнительные требования.';
  if(newMedical&&p.date<='2026-12-31')result.route+=' Для позиций 388(1)–388(3) до 31.12.2026 предусмотрен СТ-1 по п.10 в.';
  if(fish)result.route+=' Для рыбы дополнительно ветеринарные документы при поставке, п.3 к, л.';
  if(p.origin==='foreign')return {...result,state:'foreign',reason:'Указано происхождение из государства вне ЕАЭС.'};
  if(!['rf','eaeu'].includes(p.origin))return result;
  if(p.evidence==='none')return {...result,state:'unconfirmed',reason:'Подтверждение для заявки не указано. Наличие производства или бренда его не заменяет.'};
  const expected=software?(p.origin==='rf'?'software_rf':'software_eaeu'):industrial?(p.origin==='rf'?'registry_rf':'registry_eaeu'):'declaration';
  if(p.evidence==='st1')return {...result,state:'unknown',reason:newMedical?'Проверь форму СТ-1, изготовителя, изделие и дату: специальный переход п.10 в.':'СТ-1 не заменяет реестровую запись автоматически. Проверь п.10 в, г, д и применимость права ЕАЭС.'};
  if(p.evidence!==expected)return {...result,state:'unconfirmed',reason:'Выбранный вид подтверждения не соответствует общему маршруту. Проверь специальные и переходные правила.'};
  if(!p.evidenceReference.trim()||(industrial||software)&&!p.registryNumber.trim())return {...result,state:'unconfirmed',reason:'Нужны реквизиты подтверждения и номер реестровой записи, если применяется реестр.'};
  if((industrial||software)&&(!goodDate(p.registryValidUntil)||p.registryValidUntil<p.date))return {...result,state:'unconfirmed',reason:'Срок действия записи не указан или закончился к дате закупки.'};
  if(industrial&&p.registryPoints!=='yes')return {...result,state:'unknown',reason:'Нужно подтвердить закупочный порог в реестре либо отсутствие балльного требования. Расчёт №719 в прототипе не заменяет сведения реестра.'};
  if(industrial&&p.registryLevel==='unknown')return {...result,state:'unknown',reason:'Уточни наличие требования об уровне радиоэлектронной продукции в реестровой записи.'};
  return {...result,state:'eaeu',reason:'Сведения заполнены по общему маршруту. Проверка реестра онлайн и оценка подлинности документов не выполнялись.'};
 }
 function evaluate(raw){
  const p=normalizeInput(raw),issues=[],notes=[],selected=[],candidates=D.rows.filter(r=>r.annex<4&&matches(r,p.code)&&active(r,p.date));
  let pending=false;
  for(const r of candidates){let s=p.selections[r.id]||'unknown';if(s==='yes')selected.push(r);if(s==='unknown')pending=true;}
  const isValid=valid(p),rowRefs=selected.map(ref),ex=isValid?exceptionResult(p,selected):{ban:false,restriction:false,advantage:false,notes:[],pending:true},proof=isValid?origin(p,selected):{state:'unknown',route:'',reason:'Проверь поля.'};
  const out={version:D.version,inputDate:p.date,selected:selected.map(clone),candidates:candidates.map(r=>({id:r.id,selection:p.selections[r.id]||'unknown'})),issues,notes,exceptions:ex,origin:proof,ban:card('unknown','Уточни данные',''),restriction:card('unknown','Уточни данные',''),quota:card('unknown','Уточни данные',''),advantage:card('unknown','Уточни данные',''),admission:'Итог допуска не определён.'};
  if(!valid(p)){issues.push('Проверь код ОКПД2, дату и значения полей.');return out;}
  if(p.date<D.verifiedFrom||p.date>D.verifiedThrough){issues.push('Для этой даты редакция не проверена. Поддерживаемый снимок: 01–05.10.2026. Будущие строки доступны в поиске как справка.');return out;}
  if(!/^\d{2}\.\d{2}\.\d{2}(?:\.\d{3})?$/.test(p.code))issues.push('Введён укрупнённый код. Уточни код конкретного товара и все подходящие позиции.');
  if(!p.name.trim())issues.push('Укажи наименование и характеристики предмета закупки.');
  if(pending)issues.push('Подтверди или исключи каждую найденную позицию по наименованию и характеристикам.');
  if(selected.some(r=>r.legalConflict)){issues.push('Есть расхождение кодов в источниках. Позиция требует нормативной сверки.');pending=true;}
  if(selected.some(r=>r.medicalCodes.length&&(!p.medicalCode||!r.medicalCodes.includes(p.medicalCode)))){issues.push('Код вида медицинского изделия не совпадает либо не указан.');pending=true;}
  if(selected.some(r=>r.annex===2&&Number(r.position)>=362&&Number(r.position)<=432)&&p.medical!=='yes'){issues.push('Для позиций 362–432 нужно подтвердить, что товар является медицинским изделием.');pending=true;}
  if(p.object!=='goods'){issues.push('ПО, работы, услуги и смешанный объект требуют отдельной проверки специальных правил.');pending=true;}
  if(p.lot!=='single_item')issues.push('Для смешанного или неуточнённого лота итог по заявке нужно проверить по всему составу.');
  const special=p.law==='44'&&p.specialCustomer==='yes',goz=p.purpose==='goz';
  let scope=true;
  if(p.law==='223'){
   if(p.customer==='unknown'){issues.push('Уточни категорию заказчика по п.4 л.');scope=null;}
   else if(p.customer==='covered'&&p.purpose==='ordinary')scope=false;
   else if(p.customer==='covered'&&p.purpose==='unknown'){issues.push('Уточни назначение закупки по п.4 м.');scope=null;}
  } else if(p.specialCustomer==='unknown'){issues.push('Уточни, относится ли заказчик к п.4 ж.');scope=null;}
  const bans=selected.filter(r=>r.annex===1),restr=selected.filter(r=>r.annex===2),quotas=selected.filter(r=>r.annex===3);
  if(p.opk==='unknown')issues.push('Уточни включение заказчика в реестр ОПК для проверки п.10 м.');
  if(p.opk==='yes'){issues.push('Проверь переходное исключение ОПК по п.10 м и перечень товаров; автоматически оно не снимает меры.');pending=true;}
  const baseBan=bans.length>0||special||goz,baseRestriction=restr.length>0;
  if(scope===false){out.ban=card('off','Не распространяется','Обычная закупка отдельного заказчика по п.4 л, м.',['п.4 м']);out.restriction=clone(out.ban);out.advantage=clone(out.ban);}
  else if(scope===null||pending||issues.some(x=>x.startsWith('Введён'))){out.ban.reason=out.restriction.reason=out.advantage.reason=issues.join(' ');}
  else{
   out.ban=baseBan?(ex.ban?card('exception','Учтено исключение','По введённым данным и решению заказчика.',ex.notes):card('on','Установлен',special?'Специальный заказчик, п.4 ж.':goz?'Закупка в рамках ГОЗ, п.1.':'Совпали код и наименование.',bans.length?bans.map(ref):['п.1 / п.4 ж'])):card('off','Не найден','В проверенном снимке нет выбранной позиции приложения 1; общий запрет ГОЗ и п.4 ж не установлен.',['п.1','п.4 д']);
   out.restriction=baseRestriction?(ex.restriction?card('exception','Учтено исключение',ex.notes.join(' ')):card('on','Установлено','Действие при рассмотрении заявок зависит от соответствующего предложения российского / евразийского товара.',restr.map(ref))):card('off','Не найдено','По проверенному коду и наименованию нет позиции приложения 2.',['п.1','п.4 д']);
   out.advantage=baseBan||baseRestriction?card('off','Для этой позиции не применяется','В смешанном лоте преимущество может возникнуть при наличии товаров вне приложений 1 и 2.',['п.4 б, в']):card('conditional','Преимущество 15%','При предложении только товаров РФ / ЕАЭС и наличии допущенного иностранного предложения. Цена договора не уменьшается.',['п.1','п.4 б, в','44-ФЗ ст.14 / 223-ФЗ ст.3.1-4']);
   if(out.advantage.state==='conditional'&&p.procedure==='competitive'&&p.lot==='single_item'&&p.allEaeu==='yes'&&p.foreignBid==='yes'&&proof.state==='eaeu')out.advantage=card('on','15% при оценке цены','Условия указаны пользователем; договор по предложенной цене.',['п.4 б','44-ФЗ ст.14 / 223-ФЗ ст.3.1-4']);
  }
  if(p.law==='44'||p.customer==='other')out.quota=card('off','Не применяется','Доля приложения 3 применяется только к указанным в п.4 л заказчикам по 223-ФЗ.',['п.2','п.4 л']);
  else if(p.customer==='unknown'||pending)out.quota=card('unknown','Уточни данные','Нужны категория заказчика, код и наименование.',['п.4 е, л']);
  else if(quotas.length===1)out.quota=card('on',quotas[0].quota+'% за год','Это доля годовых закупок заказчика по позиции, а не локализация изделия или квота отдельного лота.',quotas.map(ref));
  else if(quotas.length>1)out.quota=card('unknown','Уточни позицию','Выбрано несколько позиций с долями. Уточни наименование и исключения внутри строк.',quotas.map(ref));
  else out.quota=card('off','Не найдена','В приложении 3 нет подтверждённой позиции по коду и наименованию.',['п.2']);
  if(p.exceptionReview==='unknown')issues.push('Исключения ещё не рассмотрены. Меры выше показаны по общему правилу.');
  if(ex.pending)issues.push('Выбранное исключение требует дополнительной проверки.');
  if(p.exceptionReview==='selected'&&!p.exceptions.length)issues.push('Укажи выбранное исключение и его основание.');
  const sectors=selected.filter(r=>r.annex===2&&([195,197,198,199,203,433].includes(Number(r.position))||Number(r.position)>=362&&Number(r.position)<=432)||r.annex===1&&Number(r.position)>=146);
  if(sectors.length||p.medical==='yes'||selected.some(r=>r.medicalCodes.length))issues.push('Специальная позиция: проверь уровни радиоэлектроники, ПО, медицинские, лекарственные или иные дополнительные условия. Автоматический итог допуска не выдаётся.');
  const clear=!issues.length&&p.lot==='single_item'&&scope!==null;
  if(clear){
   if(scope===false)out.admission='Меры п.1 не распространяются по п.4 м. Другие требования закупки проверяются отдельно.';
   else if(out.ban.state==='on'&&['foreign','unconfirmed'].includes(proof.state))out.admission='По общему правилу запрета иностранное или неподтверждённое предложение не допускается.';
   else if(out.restriction.state==='on'&&['foreign','unconfirmed'].includes(proof.state)&&p.otherEaeuBid==='yes')out.admission=p.law==='44'?'При указанных условиях иностранная заявка подлежит отклонению.':'При указанных условиях заключение договора на иностранный товар не допускается.';
   else if(out.restriction.state==='on'&&['foreign','unconfirmed'].includes(proof.state)&&p.otherEaeuBid==='no'&&out.ban.state!=='on')out.admission='Основание отклонения / недопуска по ограничению не выявлено: соответствующее предложение РФ / ЕАЭС отсутствует. Это не общий допуск к закупке.';
   else if(proof.state==='eaeu')out.admission='По введённым сведениям общий запрет/ограничение не препятствует предложению РФ / ЕАЭС. Остальные требования закупки проверяются отдельно.';
  }
  notes.push(...ex.notes,'Расчёт №719, наличие документов производства и происхождение товара в заявке учитываются отдельно.');
  return out;
 }
 function snapshot(p){const input=normalizeInput(p),result=evaluate(input);return {schema:1,id:'nr-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),capturedAt:new Date().toISOString(),databaseVersion:D.version,input:clone(input),result:clone(result),rules:result.selected.map(clone)};}
 const api={D,empty,normalizeInput,valid,goodDate,codeValid,within,active,search,evaluate,snapshot,exceptions,byId};
 if(root.Localization){const old=root.Localization.validateImport;root.Localization.validateImport=v=>old(v)&&v.assessments.every(a=>!a.procurement||valid(normalizeInput(a.procurement)))&&v.history.every(h=>!h.input.procurement||valid(normalizeInput(h.input.procurement)));}
 if(typeof module==='object'&&module.exports)module.exports=api;root.NationalRegime=api;
})(typeof globalThis==='object'?globalThis:this);
