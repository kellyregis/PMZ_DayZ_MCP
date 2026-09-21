#!/usr/bin/env node
// src/ingest/cli.js — CLI de indexação.
//   node src/ingest/cli.js index [--incremental] [--no-kb]
// Lê caminhos de env (mesmo do servidor) ou flags.
import path from 'path';
import { buildIndex } from './index.js';
import { config } from '../config.js';

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) { args.flags[key] = argv[++i]; }
      else args.flags[key] = true;
    } else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0] || 'index';

if (cmd === 'index') {
  const incremental = !!args.flags.incremental;
  const withKb = !args.flags['no-kb'];
  const dbPath = args.flags.db || config.dbPath;
  const versions = [];
  // Lê todas as versões configuradas em config.paths dinamicamente
  for (const [ver, root] of Object.entries(config.paths)) {
    if (root) versions.push({ version: ver, root });
  }
  // permite override via --version + --root
  if (args.flags.version && args.flags.root) {
    versions.length = 0;
    versions.push({ version: String(args.flags.version), root: path.resolve(String(args.flags.root)) });
  }
  console.error('[cli] indexando →', dbPath);
  console.error('[cli] versões:', versions.map(v => `${v.version}:${v.root}`).join('  '));
  const stats = buildIndex({ dbPath, versions, incremental, withKb });
  console.error('[cli] stats:', JSON.stringify(stats, null, 2));
  process.exit(0);
} else {
  console.error('Uso: pmz-dayz-mcp index [--incremental] [--no-kb] [--db <path>] [--version 1.29 --root <dir>]');
  process.exit(1);
}
