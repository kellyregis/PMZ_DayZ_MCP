// src/config.js — configuração central do MCP (caminhos e nomes).
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export const config = {
  serverName: 'pmz-dayz-mcp',
  serverVersion: '2.0.0',

  // Caminho do índice SQLite. Sobrescreva com PMZ_DAYZ_DB.
  dbPath: process.env.PMZ_DAYZ_DB || path.join(ROOT, 'data', 'dayz.db'),

  // Raízes das versões do jogo (contêm scripts/ e opcionalmente bin/config.cpp).
  paths: {
    '1.30': process.env.DAYZ_130_PATH || '/mnt/d/Mods/PMZ DayZ MCP/Cliente_130/dta/scripts',
    '1.29': process.env.DAYZ_129_PATH || '/mnt/d/Mods/PMZ DayZ MCP/1.29_latest',
    '1.29_old': process.env.DAYZ_129_OLD_PATH || '/mnt/d/Mods/PMZ DayZ MCP/1.29_fix',
    '1.28': process.env.DAYZ_128_PATH || '/mnt/d/Mods/PMZ DayZ MCP/1.28',
  },

  // Versão default respondida quando a tool não especifica.
  defaultVersion: process.env.PMZ_DAYZ_DEFAULT_VERSION || '1.29',
};

export default config;
