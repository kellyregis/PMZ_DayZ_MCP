import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const t = new StdioClientTransport({ command:'node', args:['index.js'],
  env:{...process.env, PMZ_DAYZ_DB:'/mnt/d/Mods/PMZ DayZ MCP/pmz-dayz-mcp/data/dayz.db'} });
const c = new Client({name:'t',version:'1'},{capabilities:{}});
await c.connect(t);
const call = async (n,a)=>{ const r = await c.callTool({name:n,arguments:a}); return {err:r.isError, txt:r.content[0].text}; };
const cases = [
  ['dayz_search_symbol',{query:'ItemBase',kind:'class',limit:3}],
  ['dayz_get_class',{name:'CarScript',include_inherited:false}],
  ['dayz_inheritance_chain',{name:'Truck_01_Base',direction:'both',depth:6}],
  ['dayz_get_method',{method:'EEKilled',class:'PlayerBase'}],
  ['dayz_get_source',{file:'ItemBase.c',line_start:1,line_end:3}],
  ['dayz_find_references',{name:'ItemBase',ref_kind:'extends',page:1}],
  ['dayz_list_hooks',{class:'Car'}],
  ['dayz_get_config_class',{name:'Mode_FullAuto',resolve_inheritance:true}],
  ['dayz_config_search',{query:'recoil',by:'param',limit:3}],
  ['dayz_kb_search',{query:'central economy lifetime restock'}],
  ['dayz_semantic_search',{query:'como fazer item apodrecer com o tempo',scope:'all',limit:4}],
  ['dayz_api_diff',{from:'1.28',to:'1.29',name:'PlayerBase'}],
  ['dayz_index_status',{}],
];
let ok=0,bad=0;
for (const [n,a] of cases){
  try{ const r = await call(n,a); const j=JSON.parse(r.txt.startsWith('{')||r.txt.startsWith('[')?r.txt:'{}');
    const hasErr = r.err || (j && j.error);
    console.log((hasErr?'⚠ ':'✓ ')+n, '→', r.txt.replace(/\s+/g,' ').slice(0,80));
    if(hasErr && n!=='dayz_get_config_class') bad++; else ok++;
  }catch(e){ console.log('✗ '+n, e.message); bad++; }
}
console.log(`\n${ok} ok, ${bad} problemas`);
await c.close();
