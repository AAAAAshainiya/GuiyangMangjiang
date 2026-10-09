import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
export function loader(overrides={}){
 const cache=new Map(),synthetic=new Map();
 function shim(key,value){if(!synthetic.has(key))synthetic.set(key,new vm.SyntheticModule(Object.keys(value),function(){for(const k of Object.keys(value))this.setExport(k,value[k])}));return synthetic.get(key)}
 async function get(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,m=new vm.SourceTextModule(code,{identifier:file});cache.set(file,m);return m}
 async function link(name,parent){if(overrides[name])return shim(name,overrides[name]);if(name.startsWith('.')||name.startsWith('@/')){let target=name.startsWith('@/')?path.resolve(name.slice(2)):path.resolve(path.dirname(parent.identifier),name);if(!path.extname(target))target+=fs.existsSync(target+'.ts')?'.ts':'.tsx';return get(target)}return shim(name,await import(name))}
 return async file=>{const m=await get(file);if(m.status==='unlinked')await m.link(link);if(m.status!=='evaluated')await m.evaluate();return m.namespace};
}
