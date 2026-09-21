// src/server.js — servidor MCP (stdio). Só LÊ o índice SQLite; nunca parseia em runtime.
import fs from 'fs';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { openDb } from './db/database.js';
import { Queries } from './db/queries.js';
import { buildTools } from './tools/index.js';
import { registerPrompts } from './prompts/index.js';
import { config } from './config.js';

export async function startServer() {
  const dbPath = config.dbPath;
  if (!fs.existsSync(dbPath)) {
    console.error(`[MCP] ❌ Índice não encontrado em ${dbPath}`);
    console.error('[MCP] Rode a indexação primeiro: node src/ingest/cli.js index');
    process.exit(1);
  }
  const db = openDb(dbPath, { readonly: true });
  const queries = new Queries(db);

  const server = new McpServer({ name: config.serverName, version: config.serverVersion });

  // ── Tools ──────────────────────────────────────────────────────────────────
  const tools = buildTools(queries);
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.schema },
      async (args) => {
        try {
          return t.handler(args || {});
        } catch (err) {
          console.error(`[MCP] erro na tool ${t.name}:`, err);
          return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
        }
      }
    );
  }

  // ── Resources ────────────────────────────────────────────────────────────
  // dayz://docs/{doc_id} — abre um doc curado inteiro
  server.registerResource(
    'kb-doc',
    new ResourceTemplate('dayz://docs/{doc_id}', {
      list: async () => {
        const rows = db.prepare('SELECT doc_id, title FROM docs ORDER BY doc_id').all();
        return { resources: rows.map(r => ({ uri: `dayz://docs/${r.doc_id}`, name: r.doc_id, description: r.title, mimeType: 'text/markdown' })) };
      },
    }),
    { title: 'Knowledge Base DayZ', description: 'Documentos curados de subsistemas', mimeType: 'text/markdown' },
    async (uri, { doc_id }) => {
      const row = db.prepare('SELECT title, body FROM docs WHERE doc_id=?').get(doc_id);
      if (!row) return { contents: [{ uri: uri.href, text: `# Not found: ${doc_id}` }] };
      return { contents: [{ uri: uri.href, mimeType: 'text/markdown', text: `# ${row.title}\n\n${row.body}` }] };
    }
  );

  // dayz://index/status
  server.registerResource(
    'index-status', 'dayz://index/status',
    { title: 'Status do índice', description: 'Contagens e saúde do índice', mimeType: 'application/json' },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(queries.indexStatus(), null, 2) }] })
  );

  // ── Prompts (recipes de modding PMZ) ─────────────────────────────────────
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[MCP] pmz-dayz-mcp v${config.serverVersion} conectado (db: ${dbPath}) ✅`);
  const st = queries.indexStatus();
  console.error(`[MCP] versões: ${st.versions.join(', ')} | docs KB: ${st.docs}`);
}
