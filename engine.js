(function(host){
  'use strict';
  const VERSION='0.7.0', RELEASE='localization-719-2026-10-13', SCHEMA='0.1.0';
  const root='https://www.consultant.ru/document/cons_doc_LAW_183175/';
  const SOURCES={xix:root+'33db50733595dd603ee199a69c4efe4b8a85794b/',xxvi:root+'636332d7b93a7be0442706afb1ee4630c86edcd3/',notes:root+'54c67e703389112d3f989062d908377adc7204b5/'};
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  function gcd(a,b){a=a<0n?-a:a;while(b){const t=a%b;a=b;b=t;}return a||1n;}
  class Rational{
    constructor(n,d=1n){if(d===0n)throw Error('zero denominator');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);this.n=n/g;this.d=d/g;}
    static parse(v){if(v instanceof Rational)return v;if(typeof v==='number'){if(!Number.isFinite(v))return null;v=String(v);}if(typeof v!=='string')return null;v=v.trim().replace(/\s/g,'').replace(',','.');if(!/^-?\d{1,30}(\.\d{1,12})?$/.test(v))return null;const [whole,part='']=v.split('.');return new Rational(BigInt(whole+part),10n**BigInt(part.length));}
    add(b){return new Rational(this.n*b.d+b.n*this.d,this.d*b.d);}
    mul(b){return new Rational(this.n*b.n,this.d*b.d);}
    div(b){return new Rational(this.n*b.d,this.d*b.n);}
    cmp(b){const n=this.n*b.d-b.n*this.d;return n<0n?-1:n>0n?1:0;}
    number(){return Number(this.n)/Number(this.d);}
    exact(){let d=this.d;while(d%2n===0n)d/=2n;while(d%5n===0n)d/=5n;if(d!==1n)return this.n+'/'+this.d;let digits=0,scale=1n;while(scale%this.d!==0n){scale*=10n;digits++;}const n=this.n*(scale/this.d),sign=n<0n?'-':'';let s=String(n<0n?-n:n).padStart(digits+1,'0');if(digits)s=s.slice(0,-digits)+'.'+s.slice(-digits);return sign+s;}
  }
  const R=v=>Rational.parse(v), zero=R('0'), hundred=R('100');
  const ref=path=>({op:'ref',path}), lit=value=>({op:'literal',value}), ex=(op,...args)=>({op,args});
  function read(obj,path){let value=obj;for(const key of path.split('.')){if(['__proto__','prototype','constructor'].includes(key)||value==null||!Object.hasOwn(value,key))return null;value=value[key];}return value===undefined||value===null||value==='unknown'?null:value;}
  function interpret(node,context){
    if(!node||typeof node!=='object')throw Error('invalid expression');
    if(node.op==='ref')return read(context,node.path);
    if(node.op==='literal')return node.value;
    const args=(node.args||[]).map(n=>interpret(n,context));
    if(node.op==='all')return args.includes(false)?false:args.includes(null)?null:args.every(v=>v===true);
    if(node.op==='any')return args.includes(true)?true:args.includes(null)?null:false;
    if(node.op==='not')return args[0]===null?null:!args[0];
    if(args.includes(null))return null;
    if(node.op==='eq')return typeof args[0]===typeof args[1]?args[0]===args[1]:null;
    if(node.op==='in')return Array.isArray(args[1])?args[1].includes(args[0]):null;
    if(node.op==='date_covers')return args.every(validDate)?args[0]<=args[2]&&args[1]>=args[2]:null;
    const nums=args.map(R);if(nums.includes(null))return null;
    switch(node.op){
      case 'gte':return nums[0].cmp(nums[1])>=0;
      case 'lte':return nums[0].cmp(nums[1])<=0;
      case 'sum':return nums.reduce((a,b)=>a.add(b),zero);
      case 'multiply':return nums[0].mul(nums[1]);
      case 'ratio':case 'divide':return nums[1].n===0n?null:nums[0].div(nums[1]);
      case 'max':return nums.reduce((a,b)=>a.cmp(b)>0?a:b);
      case 'min':case 'cap':return nums.reduce((a,b)=>a.cmp(b)<0?a:b);
      case 'once':return nums[0];
      default:throw Error('unsupported expression: '+node.op);
    }
  }
  function validDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
  const qualifying=ex('all',ex('eq',ref('state'),lit('yes')),ex('eq',ref('complete'),lit('yes')));
  function criterion(id,name,options={}){
    const c={id,name,group:'Обязательные условия',mandatory:true,points:0,...options};
    const args=clone(qualifying.args);
    if(c.territory)args.push(ex('in',ref('place'),lit(c.territory==='rf'?['rf']:['rf','eaeu'])));
    if(c.id==='rights')args.push(ex('gte',ref('years'),lit('5')));
    c.predicate=ex('all',...args);c.creditGroup=c.id;return c;
  }
  const common=[
    criterion('rights','Права на КД и ТД',{territory:'eaeu',description:'У налогового резидента ЕАЭС есть действующие права минимум на 5 лет. Объём позволяет производить, модернизировать и развивать изделие.'}),
    criterion('service','Сервисный центр',{territory:'eaeu',description:'В ЕАЭС действует уполномоченный сервис: ремонт, послепродажное и гарантийное обслуживание.'}),
    criterion('bench','Предусмотренные испытания',{territory:'eaeu',description:'Испытания выполняются на стенде в ЕАЭС. Испытательное оборудование аттестовано по применимому порядку.'})
  ];
  const rotaryOps=[
    ['Заготовительные операции','Получение предусмотренных заготовок литьём, ковкой или штамповкой.'],
    ['Термообработка','Выполнение предусмотренной термической обработки.'],
    ['Неразрушающий контроль','Выполнение предусмотренного неразрушающего контроля.'],
    ['Механическая обработка','Выполнение предусмотренных операций механической обработки.'],
    ['Сварка','Предусмотренные сварочные работы на рамах и трубопроводах.'],
    ['Сборка','Выполнение сборочных операций.'],
    ['Окраска и защитные покрытия','Выполнение окраски и нанесения защитных покрытий.']
  ].map(([name,description],i)=>criterion('op'+i,name,{territory:'rf',group:'Производственные операции',description}));
  const scored=[
    ['Корпус: заготовка',60,'Корпус','Заготовка корпуса, работающего под давлением: применимый вариант литья, ковки или штамповки.'],
    ['Корпус: сварка и термообработка',30,'Корпус','Предусмотренные сварочные и/или термические операции; при наличии.'],
    ['Корпус: неразрушающий контроль',40,'Корпус','Предусмотренный неразрушающий контроль; при наличии.'],
    ['Корпус: мехобработка',110,'Корпус','Применимый набор точения, сверления, расточки, фрезерования, резьбы, шлифования или полировки.'],
    ['Колесо/диффузор: заготовка',50,'Колесо и диффузор','Заготовка колеса и/или диффузора: применимый вариант литья, ковки или штамповки.'],
    ['Колесо/диффузор: сварка и термообработка',30,'Колесо и диффузор','Предусмотренные сварочные и/или термические операции; при наличии.'],
    ['Колесо/диффузор: неразрушающий контроль',40,'Колесо и диффузор','Предусмотренный неразрушающий контроль; при наличии.'],
    ['Колесо/диффузор: мехобработка',80,'Колесо и диффузор','Применимые операции мехобработки. Одна подрезка диаметра колеса под параметры не даёт зачёт.'],
    ['Вал: заготовка и термообработка',20,'Вал','Заготовка вала; также термообработка, когда она предусмотрена.'],
    ['Вал: неразрушающий контроль',40,'Вал','Предусмотренный неразрушающий контроль; при наличии.'],
    ['Вал: мехобработка',50,'Вал','Применимый набор операций механической обработки вала.'],
    ['Остальные детали статора: заготовка',30,'Остальные детали статора','Заготовки остальных статорных деталей. Корпус под давлением сюда повторно не включается.'],
    ['Остальные детали статора: сварка и термообработка',40,'Остальные детали статора','Предусмотренные сварочные и/или термические операции; при наличии, без повторного учёта корпуса.'],
    ['Остальные детали статора: неразрушающий контроль',40,'Остальные детали статора','Предусмотренный контроль; при наличии, без повторного учёта корпуса.'],
    ['Остальные детали статора: мехобработка',70,'Остальные детали статора','Применимые операции мехобработки остальных деталей, без повторного учёта корпуса.'],
    ['Трубопроводная обвязка',50,'Сборка и комплектующие','Предусмотрены резка, гибка, сварка и неразрушающий контроль. Использованы подходящие по происхождению арматура и комплектующие.'],
    ['Сборка и балансировка',30,'Сборка и комплектующие','Выполнены сборка ротора, его балансировка и сборка насоса.'],
    ['Защитные покрытия',50,'Сборка и комплектующие','Нанесены предусмотренные антикоррозионные и специальные покрытия.'],
    ['Уплотнения',50,'Сборка и комплектующие','Производство в РФ либо использование подходящих по происхождению концевых уплотнений и уплотнительных элементов.'],
    ['Подшипники',30,'Сборка и комплектующие','Использование подшипников предусмотренного происхождения. Страна продавца происхождение не определяет.'],
    ['Средства измерений',60,'Сборка и комплектующие','Использование предусмотренных контрольно-измерительных приборов и их компонентов подходящего происхождения.']
  ].map(([name,points,group,description],i)=>criterion('B'+String(i+1).padStart(2,'0'),name,{points,group,description,mandatory:false,territory:i<18?'rf':null,originRequired:i===15||i>=19,manufactureOrUse:i===18,optional:true}));
  const lngCommon=clone(common);lngCommon[2].territory='rf';lngCommon[2].description='Предусмотренные нормативными актами испытания выполняются в РФ.';lngCommon[2].predicate=ex('all',...clone(qualifying.args),ex('in',ref('place'),lit(['rf'])));
  const review='Правила пилота на 05.10.2026. Результат предварительный; официальная цепочка источников требует завершения перед рабочим выпуском.';
  const measurementData=typeof module!=='undefined'&&module.exports?require('./measurement-data.js'):host.MeasurementData;
  const measurementEntries=measurementData.map(item=>({
    id:item.id,code:item.code,title:item.title,method:'points',family:'measurement',version:item.id+'-v1',
    source:item.source,notesSource:SOURCES.notes,legalFrom:'2023-06-09',verifiedFrom:'2026-10-13',maximum:item.maximum,
    review:'Операции сверены с текстом раздела XXII на 13.10.2026. Пороги зависят от цели. Полная официальная цепочка изменений ещё не подтверждена.',
    scope:'Раздел XXII, из '+item.code+'. Подтверди вид прибора по назначению и принципу измерения. Общее название кода не заменяет выбор позиции.',
    thresholdPolicy:{kind:'measurement-note29',source:'https://www.consultant.ru/document/cons_doc_LAW_183175/2520ddabe22a7b4c40206228222ea3d6f5b74f8a/',support:{from:'2024-01-01',percent:'60'},procurement:[{from:'2023-06-09',to:'2024-01-01',percent:item.id==='level-meter'?'50':'55'},{from:'2024-01-01',to:'2025-01-01',percent:'70'},{from:'2025-01-01',to:'2026-01-01',percent:item.id==='level-meter'?'85':'80'}]},
    route:{title:'Акт экспертизы ТПП → заявление через ГИСП → решение и реестровая запись',basis:'ПП №719, п. 1 «б», п. 1(2), п. 1(5). Для уже включённой продукции предусмотрен акт оценки по п. 1 «в».',source:'https://www.consultant.ru/document/cons_doc_LAW_183175/92d969e26a4326c5d02fa79b8f9cf4994ee5633b/',note:'Базовый маршрут по приложению. Состав заявления и актуальный порядок ТПП нужно сверить перед подачей; расчёт не создаёт акт или запись.'},
    criteria:[
      criterion('kd_copies','Учтённые копии КД по ЕСКД',{category:'rights',description:'У изготовителя имеются учтённые копии конструкторской документации по ЕСКД. Одна отметка о наличии файла не заменяет этот факт.',evidence:'Учтённые копии КД и сведения об их учёте'}),
      criterion('tu_registered','ТУ зарегистрированы в Федеральном информационном фонде стандартов',{category:'rights',description:'Регистрация ТУ по порядку, предусмотренному п. 24.1 ст. 9 ФЗ о стандартизации. Внутреннее утверждение ТУ само по себе этого не подтверждает.',evidence:'ТУ и сведения об их регистрации в ФИФ стандартов'}),
      criterion('service','Гарантийное обслуживание в РФ',{territory:'rf',category:'readiness',description:'Изготовитель обеспечивает гарантийное обслуживание выпускаемых средств измерений на территории РФ.',evidence:'Документы изготовителя об организации гарантийного обслуживания в РФ'}),
      ...item.operations.map((op,i)=>criterion('M'+String(i+1).padStart(2,'0'),op.name,{mandatory:false,points:op.points,territory:'rf',group:'Производственные операции',exclusionReasonRequired:true,minMountedPercent:op.name.includes('70 процентов')?'70':null,russianSoftware:op.name.includes('российского программного'),description:'Выполнение в РФ: '+op.name+'. Исключение допустимо, только если операция отсутствует в технологии изготовления изделия, с основанием по ТД.',evidence:'Технологические документы и записи о выполнении операции, исполнитель и площадка'}))
    ]
  }));
  const entries=freeze([
    ...measurementEntries,
    {id:'rotary',code:'28.13.13',title:'Роторные объёмные насосы',method:'conditions',version:'rotary-engine-v1',source:SOURCES.xix,notesSource:SOURCES.notes,review,legalFrom:'2020-01-01',verifiedFrom:'2026-10-05',criteria:[...common,...rotaryOps],foreignLimit:'10',scope:'Раздел XIX. Для позиции проверяются обязательные условия, все перечисленные производственные операции и доля иностранных комплектующих.'},
    {id:'generic',code:'28.13.14.110',title:'Центробежные насосы: выбор позиции',method:'unresolved',version:'generic-selection-v1',source:SOURCES.xix,review:'По этому коду несколько позиций. Сначала уточни назначение, тип и стандарт.',criteria:[],scope:'Нельзя назначить порог по одному коду. Выбери подходящего кандидата по характеристикам; полный расчёт этой ветви ещё не подготовлен.'},
    {id:'lng',code:'28.13.14.110',title:'Технологические насосы для СПГ',method:'points',version:'lng-engine-v1',source:SOURCES.xxvi,notesSource:SOURCES.notes,review,legalFrom:'2024-02-25',verifiedFrom:'2026-10-05',criteria:[...lngCommon,...scored],maximum:1000,periods:[{from:'2024-02-25',to:'2028-01-01',base:'750'},{from:'2028-01-01',to:null,base:'850'}],scope:'Раздел XXVI. Отдельные насосы BB1, BB2, BB3, BB5 и VS1/VS6 для крупнотоннажного производства СПГ. Агрегаты и насосные станции требуют другой расчётной ветви.'},
    {id:'submerged',code:'28.13.14.110',title:'Герметичные погружные насосы отгрузки СПГ',method:'unresolved',version:'submerged-selection-v1',source:SOURCES.xxvi,review:'Отдельная позиция с собственными условиями. Полный расчёт в этой версии не подключён.',criteria:[],scope:'Не переносить условия технологических насосов BB/VS. У этой позиции другой порог, права, подразделения и испытания.'},
  ]);
  function search(query){const q=String(query||'').trim().toLowerCase(),digits=q.replace(/\D/g,'');if(!q)return entries;return entries.filter(e=>/^[\d.\s]+$/.test(q)?e.code.replace(/\D/g,'').startsWith(digits)||e.registry?.number.startsWith(digits)||e.registry?.catalog===digits:(e.title+' '+e.code).toLowerCase().includes(q));}
  function empty(entry){return {id:'assessment-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),entryId:entry.id,ruleVersion:entry.version,name:entry.registry?.name||entry.title,date:entry.family==='measurement'?'2026-10-13':'2026-10-05',target:'2028-01-01',law:'223',customer:'unknown',purpose:'ordinary',goal:'localization',manufacturer:'',variant:'',characteristics:'',classification:false,selection:{type:'unknown',usage:'unknown',standard:'unknown',equipment:'pump'},facts:Object.fromEntries(entry.criteria.map(c=>[c.id,{state:'unknown',complete:'unknown',place:'unknown',documentPresent:false,reference:'',executor:'unknown',performer:'',applicable:c.points?'unknown':'yes',basis:'',years:'',origin:'unknown',originBasis:'',route:'unknown',diameterOnly:false,includesPressureBody:false,validFrom:'',validUntil:'',exclusionReason:'unknown',mountedPercent:'',softwareRussian:'unknown',softwareBasis:''}])),costs:{mode:'totals',basis:'components',total:'',foreign:'',bomComplete:false,documentPresent:false,reference:''},bom:[],scenario:'own',scenarioChanges:[],tasks:[],notes:'',synthetic:false};}
  function normalize(a){const e=entries.find(e=>e.id===a.entryId);if(!e)return a;const defaults=empty(e);for(const [k,v] of Object.entries(defaults))if(a[k]===undefined)a[k]=clone(v);return a;}
  function applicability(c,f){if(!c.points)return {status:'yes'};if(f?.applicable==='no'&&c.exclusionReasonRequired&&f.exclusionReason!=='absent_technology')return {status:'unknown',reason:'Исключение допускается только при отсутствии операции в технологии. Передача подрядчику или за рубеж не уменьшает максимум.'};if(f?.applicable==='no')return f.basis?.trim()?{status:'no'}:{status:'unknown',reason:'Для исключения нужно основание по конструкции и технологии.'};if(f?.applicable!=='yes')return {status:'unknown',reason:'Применимость условия к конструкции не указана.'};return {status:'yes'};}
  function row(entry,c,f,date){
    const app=applicability(c,f),out={...c,documentPresent:f?.documentPresent===true,applicability:app.status,status:'unknown',reason:''};
    if(app.status==='no'){out.status='not_applicable';out.reason='Исключено по указанному основанию: '+f.basis;return out;}
    if(app.status==='unknown'){out.reason=app.reason;return out;}
    if(!f||f.state==='unknown'){out.reason='Факт выполнения не указан.';return out;}
    if(f.state==='no'){out.status='failed';out.reason='Указано, что условие не выполнено.';return out;}
    if(f.complete==='no'){out.status='failed';out.reason='Условие выполнено частично. Полный вес не начисляется.';return out;}
    if(c.id==='B08'&&f.diameterOnly){out.status='failed';out.reason='Одна подрезка диаметра колеса не даёт зачёт мехобработки.';return out;}
    if(['B12','B13','B14','B15'].includes(c.id)&&f.includesPressureBody){out.status='failed';out.reason='Корпус под давлением нельзя повторно учесть в прочих деталях статора.';return out;}
    if(c.id==='rights'){
      const years=R(f.years);if(!years||years.cmp(zero)<0){out.reason='Укажи срок прав в годах.';return out;}
      if(years.cmp(R('5'))<0){out.status='failed';out.reason='Права предоставлены менее чем на 5 лет.';return out;}
      if(f.validFrom||f.validUntil){if(!validDate(f.validFrom)||!validDate(f.validUntil)||f.validFrom>f.validUntil){out.reason='Уточни даты действия прав.';return out;}if(date<f.validFrom||date>f.validUntil){out.status='failed';out.reason='На дату оценки права не действуют.';return out;}}
    }
    if(c.minMountedPercent){const pct=R(f.mountedPercent);if(!pct||pct.cmp(zero)<0||pct.cmp(hundred)>0){out.reason='Укажи долю электронных компонентов, смонтированных на подложки печатных плат в РФ, от 0 до 100%.';return out;}if(pct.cmp(R(c.minMountedPercent))<0){out.status='failed';out.reason='Монтаж в РФ охватывает менее '+c.minMountedPercent+'% электронных компонентов.';return out;}}
    if(c.russianSoftware){if(f.softwareRussian==='no'){out.status='failed';out.reason='Условие требует российского ПО.';return out;}if(f.softwareRussian!=='yes'||!f.softwareBasis?.trim()){out.reason='Укажи российское происхождение ПО и основание. Место загрузки ПО само по себе недостаточно.';return out;}}
    let predicate=c.predicate;
    if(c.manufactureOrUse){
      if(f.route==='manufacture')predicate=ex('all',...clone(qualifying.args),ex('eq',ref('place'),lit('rf')));
      else if(f.route==='use')predicate=clone(qualifying);
      else {out.reason='Уточни: производство уплотнений или использование готовых.';return out;}
    }
    if(c.originRequired||c.manufactureOrUse&&f.route==='use'){
      if(f.origin==='foreign'){out.status='failed';out.reason='Происхождение компонента не отвечает условию.';return out;}
      if(!['rf','eaeu'].includes(f.origin)||!f.originBasis?.trim()){out.reason='Уточни происхождение компонентов и его основание. Страны поставщика недостаточно.';return out;}
    }
    const result=interpret(predicate,f);out.status=result===true?'met':result===false?'failed':'unknown';
    out.reason=result===true?'Условие выполнено по введённым фактам.':f.complete==='unknown'?'Полный состав условия ещё не подтверждён.':c.territory&&f.place==='unknown'?'Место выполнения не указано.':c.territory==='rf'&&f.place!=='rf'?'Условие требует выполнения в РФ.':c.territory==='eaeu'&&f.place==='foreign'?'Условие требует территорию или резидентство ЕАЭС.':'Не хватает сведений о выполнении.';
    return out;
  }
  function rowExplanation(c,f,date='2026-10-05'){return row(null,c,f,date).reason;}
  function thresholdExact(date,maximum,entry=entries.find(e=>e.id==='lng'),goal='localization'){if(!validDate(date)||date<entry.legalFrom||!Number.isInteger(maximum)||maximum<=0||maximum>entry.maximum)return null;if(entry.thresholdPolicy){const info=thresholdInfo(entry,date,goal);return info.percent?R(info.percent).mul(R(String(maximum))).div(hundred):null;}const period=entry.periods.find(p=>date>=p.from&&(!p.to||date<p.to));return period?R(period.base).mul(R(String(maximum))).div(R(String(entry.maximum))):null;}
  function thresholdInfo(entry,date,goal){
    if(!entry.thresholdPolicy)return {label:'Порог выбранной позиции',percent:null,reason:''};
    const p=entry.thresholdPolicy;
    if(goal==='support')return date>=p.support.from?{label:'Меры господдержки · примечание 29',percent:p.support.percent,reason:'60% от применимого максимума для мер господдержки по примечанию 29; условия конкретной меры проверяются отдельно.'}:{label:'Меры господдержки',percent:null,reason:'Порог господдержки до 2024 года не установлен этим правилом.'};
    if(goal==='procurement'){const period=p.procurement.find(x=>date>=x.from&&date<x.to);return period?{label:'Закупки · примечание 29',percent:period.percent,reason:'Порог таблицы примечания 29 для указанного года; это не процент локализации.'}:{label:'Закупки · период требует проверки',percent:null,reason:'В проверенной таблице примечания 29 указаны 2023–2025 годы. Применение последнего значения к '+date.slice(0,4)+' году не подтверждено; порог не переносится автоматически.'};}
    return {label:goal==='registry'?'Подготовка к реестру':'Параметры локализации',percent:null,reason:'Баллы и обязательные условия рассчитаны отдельно. Универсальный порог для этой цели не назначен: выбери применимое основание, если оно установлено для твоей задачи. Закупочный порог не подставляется.'};
  }
  function threshold(date,maximum){return thresholdExact(date,maximum)?.number()??null;}
  function costResult(a,limit='10'){
    const result={share:null,shareExact:null,minimum:null,maximum:null,status:'unknown',reason:'Укажи стоимость всех комплектующих и учитываемую иностранную часть.'};
    if(a.costs.basis!=='components'){result.status='invalid';result.reason='Знаменатель должен включать стоимость комплектующих, а не цену готового изделия.';return result;}
    let total,foreign,uncertain=zero;
    if(a.costs.mode==='bom'){
      if(!a.costs.bomComplete||!a.bom.length){result.reason='Укажи полный состав учитываемых комплектующих.';return result;}
      total=zero;foreign=zero;
      for(const item of a.bom){const quantity=R(item.quantity),price=R(item.unitCost);if(!quantity||!price||quantity.cmp(zero)<=0||price.cmp(zero)<0||item.currency!=='RUB'){result.status='invalid';result.reason='В составе есть неизвестная или некорректная стоимость, количество или валюта.';return result;}const value=quantity.mul(price);total=total.add(value);if(item.origin==='foreign'&&item.originBasis?.trim())foreign=foreign.add(value);else if(!['rf','eaeu'].includes(item.origin)||!item.originBasis?.trim())uncertain=uncertain.add(value);}
    }else{total=R(a.costs.total);foreign=R(a.costs.foreign);if(!total||!foreign)return result;}
    if(total.cmp(zero)<=0||foreign.cmp(zero)<0||foreign.add(uncertain).cmp(total)>0){result.status='invalid';result.reason='Проверь стоимости: общая должна быть положительной, иностранная часть не может превышать общую.';return result;}
    const min=foreign.div(total).mul(hundred),max=foreign.add(uncertain).div(total).mul(hundred);result.minimum=min.number();result.maximum=max.number();
    if(uncertain.n===0n){result.share=min.number();result.shareExact=min.exact();}
    result.status=min.cmp(R(limit))>0?'failed':max.cmp(R(limit))<=0?'met':'unknown';
    result.reason=result.status==='failed'?'Учитываемая иностранная доля превышает '+limit+'%.':result.status==='met'?'Стоимостное условие выполнено.': 'Неизвестное происхождение влияет на вывод: доля от '+min.number().toFixed(4)+' до '+max.number().toFixed(4)+'%.';
    return result;
  }
  function selectionIssue(entry,a){
    if(entry.method==='unresolved')return 'Расчётная ветвь не подготовлена; сначала уточни позицию и её требования.';
    if(!a.classification)return 'Подтверди выбор нормативной позиции по характеристикам.';
    if(a.ruleVersion!==entry.version)return 'Данные связаны с другой версией правил. Нужен новый выбор и перенос условий.';
    if(entry.id==='lng'){
      if(a.selection.equipment!=='pump')return 'Для агрегата нужен отдельный расчёт. В этой ветви оценивается отдельный насос.';
      if(!['BB1','BB2','BB3','BB5','VS1','VS6'].includes(a.selection.type)||a.selection.usage!=='large_lng'||!['gost','inti','both'].includes(a.selection.standard))return 'Для этой позиции нужны тип BB/VS, крупнотоннажное СПГ и применённый стандарт.';
    }
    return '';
  }
  function ledger(rows,documented=false){const groups=new Map();for(const c of rows.filter(r=>r.points&&r.status==='met'&&(!documented||r.documentPresent))){const previous=groups.get(c.creditGroup)||0;groups.set(c.creditGroup,Math.max(previous,c.points));}return [...groups.values()].reduce((n,v)=>n+v,0);}
  function evaluate(entry,a,date=a.date){
    const rows=entry.criteria.map(c=>row(entry,c,a.facts[c.id],date)),reasons=[];
    const cost=entry.method==='conditions'?costResult(a,entry.foreignLimit):null;
    if(cost)rows.push({id:'cost',name:'Доля иностранных комплектующих',mandatory:true,points:0,applicability:'yes',documentPresent:a.costs.documentPresent===true,status:cost.status==='invalid'?'unknown':cost.status,reason:cost.reason});
    const selection=selectionIssue(entry,a);if(selection)reasons.push(selection);
    if(!validDate(date))reasons.push('Дата оценки некорректна.');
    else if(entry.legalFrom&&date<entry.legalFrom)reasons.push('Правило ещё не действовало. Нужна историческая редакция.');
    else if(entry.verifiedFrom&&date<entry.verifiedFrom)reasons.push('Исторический период не проверен в этом наборе правил.');
    const blocked=reasons.length>0;
    const applicabilityKnown=!rows.some(r=>r.points&&r.applicability==='unknown');
    const maximum=entry.method==='points'&&applicabilityKnown&&!selection?ledger(rows.filter(r=>r.applicability==='yes').map(r=>({...r,status:'met'}))):null;
    const limitExact=entry.method==='points'&&maximum!==null?thresholdExact(date,maximum,entry,a.goal):null;
    const points=ledger(rows),documentedPoints=ledger(rows,true);
    const mandatory=rows.filter(r=>r.mandatory),missing=rows.filter(r=>['failed','unknown'].includes(r.status));
    let status='unknown';
    if(!blocked){
      if(mandatory.some(r=>r.status==='failed')||cost?.status==='failed')status='failed';
      else if(entry.method==='points'&&limitExact&&R(String(points)).cmp(limitExact)<0&&rows.filter(r=>r.points&&r.applicability==='yes').every(r=>r.status==='met'||r.status==='failed'))status='failed';
      else if(mandatory.every(r=>r.status==='met')&&(entry.method==='conditions'?cost?.status==='met':limitExact&&R(String(points)).cmp(limitExact)>=0))status='ready';
    }
    if(entry.method==='points'&&!applicabilityKnown)reasons.push('Определи применимость всех балльных условий: без неё порог изделия неизвестен.');
    if(entry.method==='points'&&maximum===0)reasons.push('Нельзя оценить изделие с нулевым применимым максимумом.');
    if(mandatory.some(r=>r.status==='failed'))reasons.push('Есть невыполненные обязательные условия.');
    if(mandatory.some(r=>r.status==='unknown'))reasons.push('Не хватает данных по обязательным условиям.');
    if(cost&&cost.status!=='met')reasons.push(cost.reason);
    if(limitExact&&R(String(points)).cmp(limitExact)<0)reasons.push('До балльного порога не хватает '+limitExact.add(R(String(-points))).exact()+' баллов.');
    if(entry.thresholdPolicy)reasons.push(thresholdInfo(entry,date,a.goal).reason);
    if(!reasons.length)reasons.push('Предварительный вывод по введённым фактам. Официальный статус определяется отдельно.');
    return {thresholdContext:entry.thresholdPolicy?thresholdInfo(entry,date,a.goal):null,mandatoryMet:mandatory.filter(r=>r.status==='met').length,mandatoryTotal:mandatory.length,rows,points,preliminary:points,documentedPoints,confirmed:documentedPoints,maximum,limit:limitExact?.number()??null,limitExact:limitExact?.exact()??null,share:cost?.share??null,shareExact:cost?.shareExact??null,costRange:cost?[cost.minimum,cost.maximum]:null,costStatus:cost?.status??'unknown',status,blocked,missing,reasons,ruleVersion:entry.version,releaseVersion:RELEASE};
  }
  function explanations(entry,a,date=a.date){return evaluate(entry,a,date).reasons;}
  function generateTasks(entry,a){const r=evaluate(entry,a),old=new Map(a.tasks.map(t=>[t.id,t]));let needs=r.missing.map(c=>({id:c.id,title:c.name,kind:c.id==='cost'?'cost':'criterion'}));if(selectionIssue(entry,a))needs.unshift({id:'classification',title:'Уточнить нормативную позицию и характеристики',kind:'selection'});for(const c of r.rows.filter(r=>r.status==='met'&&!r.documentPresent))needs.push({id:'doc-'+c.id,title:'Добавить документы: '+c.name,kind:'document'});return needs.map(t=>old.get(t.id)||{...t,owner:'',due:a.target,cost:'',dependency:'',done:false});}
  function forecast(entry,a){const proposed=clone(a);for(const change of a.scenarioChanges||[])if(proposed.facts[change.criterionId])Object.assign(proposed.facts[change.criterionId],clone(change.values));return evaluate(entry,proposed,a.target);}
  function forecastExplanations(entry,a){return ['Прогноз по текущим фактам и явно заданным изменениям; закрытие задач факты не меняет.',...forecast(entry,a).reasons];}
  function regime(entry,a){return {ban:'Требует отдельного расчёта',restriction:'Требует отдельного расчёта',quota:a.law==='44'?'Годовая доля по 223-ФЗ не применяется':'Требует отдельного расчёта',detail:'Три меры оцениваются отдельно от производства. Полные правила и исключения подключаются на шаге 5. Сведения предыдущего пилота доступны в пояснениях.'};}
  function canonical(v){if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';return JSON.stringify(v);}
  function createSnapshot(entry,a){return freeze({schemaVersion:SCHEMA,engineVersion:VERSION,releaseVersion:RELEASE,ruleVersion:entry.version,id:'run-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),capturedAt:new Date().toISOString(),purpose:'current',input:clone(a),rule:clone(entry),result:clone(evaluate(entry,a))});}
  async function snapshotDigest(snapshot){if(host.crypto?.subtle){const bytes=new TextEncoder().encode(canonical(snapshot));const hash=await host.crypto.subtle.digest('SHA-256',bytes);return {algorithm:'SHA-256',value:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')};}return {algorithm:'unavailable',value:null};}
  function demo(entry){const a=empty(entry);a.synthetic=true;a.name='Контрольный пример: '+entry.title;a.classification=true;a.selection={type:'BB1',usage:'large_lng',standard:'gost',equipment:'pump'};for(const c of entry.criteria){const f=a.facts[c.id];Object.assign(f,{state:'yes',complete:'yes',place:'rf',applicable:'yes',years:'5',origin:'rf',originBasis:'Допущение контрольного примера',route:'use'});if(!entry.family&&c.points&&!([...Array(15)].map((_,i)=>'B'+String(i+1).padStart(2,'0')).includes(c.id)||c.id==='B17'))f.state='no';}if(entry.family==='measurement'){for(const f of Object.values(a.facts))Object.assign(f,{mountedPercent:'70',softwareRussian:'yes',softwareBasis:'Допущение контрольного примера'});}if(a.facts.rights)a.facts.rights.documentPresent=true;a.costs={mode:'totals',basis:'components',total:'1000000',foreign:'100000',bomComplete:false,documentPresent:false,reference:''};return a;}
  function migrateLegacy(old){const e=entries.find(e=>e.id===old.entryId);if(!e)throw Error('unknown legacy entry');const a=empty(e);for(const k of ['name','date','target','law','customer','purpose','goal','manufacturer','variant','characteristics','notes','scenario'])if(old[k]!==undefined)a[k]=clone(old[k]);a.classification=false;a.legacyNeedsReview=true;a.legacyOriginal=clone(old);for(const c of e.criteria){const f=old.facts?.[c.id];if(f){Object.assign(a.facts[c.id],{state:f.state||'unknown',place:f.place||'unknown',documentPresent:['present','checked','pending'].includes(f.proof),reference:f.reference||'',executor:f.executor||'unknown',performer:f.performer||''});}}if(e.id==='rotary'&&old.costs){a.costs.total=String(old.costs.total??'');a.costs.foreign=String(old.costs.foreign??'');}a.notes+='\nПеренос из 0.3: выбор и полный состав условий нужно проверить заново. Учебные балльные группы не распределялись по реальным операциям.';return a;}
  function validAssessment(a){const e=entries.find(e=>e.id===a?.entryId);const text=v=>typeof v==='string'&&v.length<=5000;return !!(e&&text(a.id)&&text(a.ruleVersion)&&text(a.name)&&a.name.length<=500&&validDate(a.date)&&validDate(a.target)&&typeof a.classification==='boolean'&&a.selection&&['type','usage','standard','equipment'].every(k=>text(a.selection[k]))&&['manufacturer','variant','characteristics','notes'].every(k=>text(a[k]))&&['44','223'].includes(a.law)&&['unknown','covered','other'].includes(a.customer)&&['ordinary','atomic','goz','kii'].includes(a.purpose)&&['localization','registry','procurement','support'].includes(a.goal)&&['own','transfer','partner','replace'].includes(a.scenario)&&a.costs&&['totals','bom'].includes(a.costs.mode)&&['components','product_price','unknown'].includes(a.costs.basis)&&text(a.costs.total)&&text(a.costs.foreign)&&typeof a.costs.bomComplete==='boolean'&&typeof a.costs.documentPresent==='boolean'&&text(a.costs.reference)&&Array.isArray(a.bom)&&a.bom.length<=200&&a.bom.every(b=>b&&['id','name','quantity','unitCost','currency','origin','originBasis','supplierCountry'].every(k=>text(b[k]))&&['rf','eaeu','foreign','unknown'].includes(b.origin))&&Array.isArray(a.tasks)&&a.tasks.length<=100&&a.tasks.every(t=>t&&['id','title','kind','owner','due','cost','dependency'].every(k=>text(t[k]))&&typeof t.done==='boolean'&&(!t.due||validDate(t.due)))&&Array.isArray(a.scenarioChanges)&&a.scenarioChanges.every(c=>c&&text(c.criterionId)&&e.criteria.some(r=>r.id===c.criterionId)&&c.values&&typeof c.values==='object')&&e.criteria.every(c=>{const f=a.facts?.[c.id];return f&&(f.exclusionReason===undefined||['unknown','absent_technology','outsourced','abroad','not_done'].includes(f.exclusionReason))&&(f.mountedPercent===undefined||text(f.mountedPercent))&&(f.softwareRussian===undefined||['unknown','yes','no'].includes(f.softwareRussian))&&(f.softwareBasis===undefined||text(f.softwareBasis))&&['yes','no','unknown'].includes(f.state)&&['yes','no','unknown'].includes(f.complete)&&['rf','eaeu','foreign','unknown'].includes(f.place)&&typeof f.documentPresent==='boolean'&&['yes','no','unknown'].includes(f.applicable)&&['reference','basis','years','originBasis','performer','validFrom','validUntil'].every(k=>text(f[k]))&&['unknown','own','contractor','foreign'].includes(f.executor)&&['rf','eaeu','foreign','unknown'].includes(f.origin)&&['unknown','manufacture','use'].includes(f.route)&&typeof f.diameterOnly==='boolean'&&typeof f.includesPressureBody==='boolean';}));}
  function validateImport(v){try{if(!v||v.formatVersion!==2||!Array.isArray(v.assessments)||v.assessments.length>100||!Array.isArray(v.history)||v.history.length>500)return false;return v.assessments.every(validAssessment)&&v.history.every(h=>h&&h.schemaVersion===SCHEMA&&typeof h.engineVersion==='string'&&validAssessment(h.input)&&h.rule&&Array.isArray(h.rule.criteria)&&h.result&&['ready','failed','unknown'].includes(h.result.status)&&Array.isArray(h.result.rows)&&h.result.rows.every(r=>r&&typeof r.name==='string'&&typeof r.reason==='string'&&typeof r.documentPresent==='boolean')&&Array.isArray(h.result.reasons)&&h.result.reasons.every(s=>typeof s==='string')&&typeof h.id==='string');}catch{return false;}}
  const api={VERSION,RELEASE,SCHEMA,SOURCES,entries,search,empty,normalize,Rational,interpret,threshold,thresholdInfo,evaluate,rowExplanation,explanations,costResult,generateTasks,forecast,forecastExplanations,regime,createSnapshot,snapshotDigest,demo,migrateLegacy,validateImport,canonical,clone,freeze};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.Localization=api;
})(typeof globalThis!=='undefined'?globalThis:this);
