'use strict';
// Generated ES modules contain the same rule data and evaluation code as Render.
// No network, publication, credentials or Site configuration changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const destination=path.resolve(process.argv[2]||path.join(__dirname,'generated-site'));
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const replaceOnce=(source,from,to)=>{
  if(source.split(from).length!==2)throw Error('Unexpected source layout: '+from);
  return source.replace(from,to);
};
function build(output=destination){
 const sourceEngine=read('engine.js'),sourceData=read('measurement-data.js'),sourceAdapter=read('adapter.js');
 let engine=replaceOnce(sourceEngine,'(function(host){',"import importedMeasurementData from './measurement-data.mjs';\nfunction buildEngine(host){");
 engine=replaceOnce(engine,"typeof module!=='undefined'&&module.exports?require('./measurement-data.js'):host.MeasurementData",'importedMeasurementData');
 engine=replaceOnce(engine,"if(typeof module!=='undefined'&&module.exports)module.exports=api;else host.Localization=api;",'return api;');
 engine=replaceOnce(engine,"})(typeof globalThis!=='undefined'?globalThis:this);",' }\nexport default buildEngine(globalThis);');
 let data=replaceOnce(sourceData,'(function(g){const data=','const data=');
 data=replaceOnce(data,';if(typeof module!=="undefined"&&module.exports)module.exports=data;else g.MeasurementData=data;})(globalThis);',';\nexport default data;');
 let adapter=replaceOnce(sourceAdapter,"const E = require('./engine.js');","import E from './engine.mjs';");
 adapter=replaceOnce(adapter,"const I = require('./legal-index.cjs');","import I from './legal-index.mjs';");
 adapter=replaceOnce(adapter,'module.exports = { health, searchRules, getRule, calculateLocalization, thresholdContext };','export { health, searchRules, getRule, calculateLocalization, thresholdContext };');
 let index=replaceOnce(read('legal-index.cjs'),"const data=require('./pp719-index.json');","import data from './pp719-index.mjs';");
 index=replaceOnce(index,"const contextData=require('./table-context.json');","import contextData from './table-context.mjs';");
 index=replaceOnce(index,'module.exports={data,search,byId,unresolved,metadata,context};','export default {data,search,byId,unresolved,metadata,context};');
 let dossier=replaceOnce(read('tpp52-dossier.cjs'),'(function(root) {','function buildDossier(root) {');
 dossier=replaceOnce(dossier,"if (typeof module !== 'undefined' && module.exports) module.exports = api;\nelse root.Tpp52Dossier = api;",'return api;');
 dossier=replaceOnce(dossier,"})(typeof globalThis !== 'undefined' ? globalThis : this);",'}\nexport default buildDossier(globalThis);');
 let projects=replaceOnce(read('project-records.cjs'),'(function(root){',"import importedDossier from './tpp52-dossier.mjs';\nimport importedIndex from './pp719-index.mjs';\nfunction buildProjects(root){");
 projects=replaceOnce(projects,"typeof module!=='undefined'&&module.exports?require('./tpp52-dossier.cjs'):root.Tpp52Dossier",'importedDossier');
 projects=replaceOnce(projects,"typeof module!=='undefined'&&module.exports?require('./pp719-index.json'):root.PP719IndexData",'importedIndex');
 projects=replaceOnce(projects,"if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.NavigatorProjects=api;",'return api;');
 projects=replaceOnce(projects,"})(typeof globalThis!=='undefined'?globalThis:this);",'}\nexport default buildProjects(globalThis);');
 const files=Object.fromEntries(Object.entries({'tpp52-dossier.mjs':dossier,'project-records.mjs':projects,'engine.mjs':engine,'measurement-data.mjs':data,'adapter.mjs':adapter,'legal-index.mjs':index,'pp719-index.mjs':'export default '+read('pp719-index.json')+';\n','table-context.mjs':'export default '+read('table-context.json')+';\n'}).map(([name,source])=>[name,source.trimEnd()+'\n']));
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const E=require('./engine.js');
 const provenance={source:'navigator-localization-719-engine-deploy',engineVersion:E.VERSION,releaseVersion:E.RELEASE,serviceVersion:require('./package.json').version,generator:'build-site-modules.cjs',sourceSha256:Object.fromEntries(['engine.js','measurement-data.js','adapter.js','legal-index.cjs','pp719-index.json','table-context.json','tpp52-dossier.cjs','project-records.cjs'].map(n=>[n,digest(read(n))])),generatedSha256:Object.fromEntries(Object.entries(files).map(([n,s])=>[n,digest(s)])),excludedLocalCard:'rzba: unresolved product-specific data remains in local HTML'};
 files['provenance.json']=JSON.stringify(provenance,null,2)+'\n';
 fs.mkdirSync(output,{recursive:true});
 for(const [name,content]of Object.entries(files))fs.writeFileSync(path.join(output,name),content);
 return {destination:output,files:Object.keys(files)};
}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports={build};
