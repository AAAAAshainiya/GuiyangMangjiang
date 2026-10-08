import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as game from '../lib/game.ts';
export async function loadLocalLibrary(file){const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;const engine=new vm.SyntheticModule(Object.keys(game),function(){for(const k of Object.keys(game))this.setExport(k,game[k])});const m=new vm.SourceTextModule(source);await m.link(()=>engine);await m.evaluate();return m.namespace}
