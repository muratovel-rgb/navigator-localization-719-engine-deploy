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
 adapter=replaceOnce(adapter,'module.exports = { health, searchRules, getRule, calculateLocalization, thresholdContext };','export { health, searchRules, getRule, calculateLocalization, thresholdContext };');
 const files=Object.fromEntries(Object.entries({'engine.mjs':engine,'measurement-data.mjs':data,'adapter.mjs':adapter}).map(([name,source])=>[name,source.trimEnd()+'\n']));
 const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
 const E=require('./engine.js');
 const provenance={source:'navigator-localization-719-engine-deploy',engineVersion:E.VERSION,releaseVersion:E.RELEASE,serviceVersion:require('./package.json').version,generator:'build-site-modules.cjs',sourceSha256:Object.fromEntries(['engine.js','measurement-data.js','adapter.js'].map(n=>[n,digest(read(n))])),generatedSha256:Object.fromEntries(Object.entries(files).map(([n,s])=>[n,digest(s)])),excludedLocalCard:'rzba: unresolved product-specific data remains in local HTML'};
 files['provenance.json']=JSON.stringify(provenance,null,2)+'\n';
 fs.mkdirSync(output,{recursive:true});
 for(const [name,content]of Object.entries(files))fs.writeFileSync(path.join(output,name),content);
 return {destination:output,files:Object.keys(files)};
}
if(require.main===module)console.log(JSON.stringify(build()));
module.exports={build};
