// src/config.js
// Configuração central do MCP — ajuste os caminhos aqui se necessário

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  // Caminhos dos Scripts DayZ no seu PC
  // Pode sobrescrever com variáveis de ambiente:
  //   set DAYZ_128_PATH=D:\outro\caminho
  dayz128Path: process.env.DAYZ_128_PATH || 'D:\\Versoes_Dayz\\PMZ DayZ MCP\\1.28',
  dayz129Path: process.env.DAYZ_129_PATH || 'D:\\Versoes_Dayz\\PMZ DayZ MCP\\1.29',

  // Subpastas a indexar dentro de cada versão
  scriptFolders: ['Scripts'],
  guiFolders:    ['GUI'],

  // Pastas dentro de Scripts a indexar
  scriptLayers: ['1_Core', '2_GameLib', '3_Game', '4_World', '5_Mission'],

  // Onde ficam os arquivos da knowledge base
  knowledgeBasePath: path.join(__dirname, '..', 'src', 'knowledge-base'),

  // Onde o índice em cache fica salvo (evita reindexar a cada start)
  cachePath: path.join(__dirname, '..', '.cache'),

  // Extensões de arquivo a indexar
  scriptExtensions: ['.c'],
  guiExtensions:    ['.layout', '.xml'],

  // Servidor MCP
  serverName:    'pmz-dayz-mcp',
  serverVersion: '1.0.0',
};
