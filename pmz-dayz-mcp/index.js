// index.js — ponto de entrada do PMZ DayZ MCP (v2, SQLite).
// Só inicia o servidor stdio; a indexação é feita pela CLI (src/ingest/cli.js).
import { startServer } from './src/server.js';

startServer().catch(err => {
  console.error('[MCP] erro fatal:', err);
  process.exit(1);
});
