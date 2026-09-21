import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const t = new StdioClientTransport({ command:'node',
  args:['/mnt/d/Mods/PMZ DayZ MCP/pmz-dayz-mcp/index.js'],
  env:{ PMZ_DAYZ_DB:'/mnt/d/Mods/PMZ DayZ MCP/pmz-dayz-mcp/data/dayz.db',
        DAYZ_129_PATH:'/mnt/d/Mods/PMZ DayZ MCP/1.29_fix', PATH:process.env.PATH }});
const c=new Client({name:'t',version:'1'},{capabilities:{}});
await c.connect(t);
const tools=await c.listTools();
console.log('CONECTOU ✓ | tools:', tools.tools.length);
await c.close();
