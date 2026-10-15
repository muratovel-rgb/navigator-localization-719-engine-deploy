(function(host){
  'use strict';
  const $=id=>document.getElementById(id);
  let api;
  const active=rows=>rows.filter(r=>r.status!=='not_applicable');
  const filled=rows=>rows.filter(r=>r.status==='met').length;
  const docs=rows=>rows.filter(r=>r.documentPresent).length;
  const text=(id,value)=>{$(id).textContent=value;};
  function refresh(entry,a,result){
    const p=a.production,rows=active(result.rows);
    const operations=rows.filter(r=>!['rights','service','bench','cost','kd_copies','tu_registered'].includes(r.id));
    const rights=Object.values(p.rights);
    const readiness=Object.values(p.readiness);
    const normativeRights=rows.find(r=>r.id==='rights');const documentation=rows.filter(r=>['kd_copies','tu_registered'].includes(r.id));
    const support=rows.filter(r=>['service','bench'].includes(r.id));
    const knownOrigins=a.bom.filter(b=>b.origin!=='unknown').length;
    const profileDocs=docs(rights)+docs(readiness);
    text('parameter-context',entry.method==='unresolved'
      ?'Требования №719 для этого случая ещё не установлены. Заполни сведения о производстве и сравни варианты; нормативный результат пока не рассчитывается.'
      :'Условия №719 оцениваются по фактам. Сведения о подготовке производства и документы показаны отдельно.');
    text('parameter-operations-state',operations.length
      ?'Выполнено '+filled(operations)+' из '+operations.length+' условий; нет данных по '+operations.filter(r=>r.status==='unknown').length+'.'
      :'Нормативные операции ещё не назначены. Начни с выбора позиции.');
    text('parameter-rights-state','Вид прав и правообладатель указаны по '+rights.filter(r=>['own','license'].includes(r.kind)&&r.holder.trim()).length+' из 3 видов документации.'+(normativeRights?' Условие №719: '+(normativeRights.status==='met'?'выполнено':normativeRights.status==='failed'?'не выполнено':'нет полных данных')+'.':'')+(documentation.length?' КД и регистрация ТУ: '+filled(documentation)+' из '+documentation.length+' обязательных условий.':''));
    text('parameter-components-state',a.bom.length
      ?'В составе '+a.bom.length+' строк; происхождение указано по '+knownOrigins+'.'
      :'Состав пока не заполнен. Узлы и происхождение доступны для любого изделия.');
    text('parameter-readiness-state','Данные по '+readiness.filter(r=>r.state!=='unknown').length+' из '+readiness.length+' направлений; готовность отмечена по '+readiness.filter(r=>r.state==='yes').length+'.'+(support.length?' Испытания и сервис: '+filled(support)+' из '+support.length+' условий.':''));
    text('parameter-documents-state',rows.length
      ?'Документы есть по '+docs(rows)+' из '+rows.length+' условий №719. В профиле отмечено '+profileDocs+'.'
      :'Перечень нормативных доказательств ещё не определён. В профиле отмечено '+profileDocs+' документов.');
    text('parameter-plan-state','Задач: '+a.tasks.length+'; вариантов выпуска: '+a.variants.length+'. Текущие факты и прогноз раздельны.');
    text('composition-calculation-note',entry.method==='conditions'
      ?a.costs.mode==='bom'?'Этот состав используется в расчёте стоимостной доли. Подтверди полноту учитываемых комплектующих.'
        :'Состав сохраняется отдельно. Сейчас доля рассчитывается по итоговым суммам; способ расчёта можно изменить выше.'
      :entry.method==='points'?'Состав сохраняется для анализа и плана. Зачёт комплектующих по №719 задаётся в соответствующих нормативных условиях.'
        :'Состав сохраняется для уточнения требований и плана. До выбора нормативного правила баллы и доля по нему не назначаются.');
    $('bom-complete-label').hidden=entry.method!=='conditions';
  }
  function openGroup(kind){
    const a=api.assessment(),entry=api.entry();
    if(kind==='plan'){api.show('plan','plan-tab');return;}
    if(kind==='operations'&&!entry.criteria.length){api.show('requirements','requirements-tab');return;}
    const targets={operations:'production-rows',rights:'profile-rights',components:'component-parameters',readiness:'profile-readiness',documents:entry.criteria.length?'production-rows':'profile-readiness'};
    if(kind==='operations'||kind==='documents'){
      for(const d of document.querySelectorAll('#production-rows > details'))d.open=true;
    }
    if(kind==='rights')for(const d of document.querySelectorAll('#profile-rights > details'))d.open=true;
    if(kind==='readiness')$('profile-roles').open=true;
    api.show('production',targets[kind]);
  }
  function init(config){
    api=config;
    for(const button of document.querySelectorAll('[data-localization-group]'))button.addEventListener('click',()=>openGroup(button.dataset.localizationGroup));
    $('summary-requirements').addEventListener('click',()=>api.show('requirements','requirements-tab'));
    $('summary-assessment').addEventListener('click',()=>{$('assessment-parameters').open=true;api.scroll('assessment-parameters');});
    $('summary-scenarios').addEventListener('click',()=>{api.show('plan','scenario-section');});
  }
  host.LocalizationUI={init,refresh};
})(globalThis);
