// index.js — PMZ DayZ MCP Server
// Ponto de entrada principal — registra todas as ferramentas

import { Server }            from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { config }         from './src/config.js';
import { ScriptIndexer }  from './src/indexer/ScriptIndexer.js';
import { KnowledgeBase }  from './src/tools/KnowledgeBase.js';

// ─── INICIALIZAÇÃO ───────────────────────────────────────────────────────────

const indexer = new ScriptIndexer();
const kb      = new KnowledgeBase();

// Cria o servidor MCP
const server = new Server(
  { name: config.serverName, version: config.serverVersion },
  { capabilities: { tools: {} } }
);

// ─── LISTA DE FERRAMENTAS ────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [

    // ── BUSCA DE CÓDIGO-FONTE ──────────────────────────────────────────────

    {
      name: 'search_class',
      description: 'Busca uma classe no código-fonte do DayZ por nome (parcial ou completo)',
      inputSchema: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Nome da classe (ex: PlayerBase, Man, ItemBase)' },
          version: { type: 'string', enum: ['1.28', '1.29', 'both'], default: 'both', description: 'Versão do DayZ' },
        },
        required: ['name'],
      },
    },

    {
      name: 'get_class_definition',
      description: 'Retorna o código-fonte completo de uma classe específica',
      inputSchema: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Nome exato da classe' },
          version: { type: 'string', enum: ['1.28', '1.29'], default: '1.29', description: 'Versão do DayZ' },
        },
        required: ['name', 'version'],
      },
    },

    {
      name: 'search_text',
      description: 'Busca texto livre no código-fonte (métodos, variáveis, strings)',
      inputSchema: {
        type: 'object',
        properties: {
          query:   { type: 'string', description: 'Texto a buscar (ex: GetBlood, PlayerIdentity)' },
          version: { type: 'string', enum: ['1.28', '1.29', 'both'], default: '1.29' },
        },
        required: ['query'],
      },
    },

    {
      name: 'search_layout',
      description: 'Busca arquivos .layout da GUI do DayZ por nome',
      inputSchema: {
        type: 'object',
        properties: {
          name:    { type: 'string', description: 'Nome do arquivo .layout (ex: Inventory, HUD)' },
          version: { type: 'string', enum: ['1.28', '1.29', 'both'], default: 'both' },
        },
        required: ['name'],
      },
    },

    // ── COMPARAÇÃO ENTRE VERSÕES ───────────────────────────────────────────

    {
      name: 'compare_class',
      description: 'Compara uma classe entre DayZ 1.28 e 1.29 — mostra métodos removidos, adicionados e alterados',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome da classe a comparar' },
        },
        required: ['name'],
      },
    },

    {
      name: 'list_changed_classes',
      description: 'Lista todas as classes que mudaram entre DayZ 1.28 e 1.29 (removidas, adicionadas, modificadas)',
      inputSchema: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'removed', 'added', 'modified'],
            default: 'all',
            description: 'Filtrar por tipo de mudança',
          },
        },
      },
    },

    {
      name: 'get_stats',
      description: 'Mostra estatísticas do índice — quantas classes e layouts indexados por versão',
      inputSchema: { type: 'object', properties: {} },
    },

    {
      name: 'rebuild_index',
      description: 'Força reindexação completa dos arquivos DayZ (use quando atualizar os Scripts)',
      inputSchema: { type: 'object', properties: {} },
    },

    // ── KNOWLEDGE BASE ─────────────────────────────────────────────────────

    {
      name: 'kb_add',
      description: 'Adiciona uma nova entrada à Knowledge Base PMZ (receita, anti-pattern, UI pattern ou log de migração)',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'],
            description: 'Categoria do conhecimento',
          },
          title:    { type: 'string',  description: 'Título descritivo (ex: Como abrir tela com fade)' },
          filename: { type: 'string',  description: 'Nome do arquivo sem espaços (ex: open_screen_fade)' },
          content:  { type: 'string',  description: 'Conteúdo em Markdown — inclua código, notas e avisos' },
          tags:     { type: 'array',   items: { type: 'string' }, description: 'Tags para facilitar busca' },
          versions: { type: 'array',   items: { type: 'string' }, description: 'Versões compatíveis (ex: ["1.28","1.29"])' },
        },
        required: ['category', 'title', 'filename', 'content'],
      },
    },

    {
      name: 'kb_update',
      description: 'Atualiza o conteúdo de uma entrada existente na Knowledge Base',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'] },
          filename: { type: 'string', description: 'Nome do arquivo a atualizar' },
          content:  { type: 'string', description: 'Novo conteúdo em Markdown' },
        },
        required: ['category', 'filename', 'content'],
      },
    },

    {
      name: 'kb_search',
      description: 'Busca na Knowledge Base PMZ por texto, categoria ou tag',
      inputSchema: {
        type: 'object',
        properties: {
          query:    { type: 'string',  description: 'Texto a buscar (ex: SteamID, layout, HUD)' },
          category: { type: 'string',  enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'], description: 'Filtrar por categoria (opcional)' },
        },
        required: ['query'],
      },
    },

    {
      name: 'kb_get',
      description: 'Lê o conteúdo completo de uma entrada da Knowledge Base',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'] },
          filename: { type: 'string', description: 'Nome do arquivo (ex: find_player_by_steamid)' },
        },
        required: ['category', 'filename'],
      },
    },

    {
      name: 'kb_list',
      description: 'Lista todos os itens da Knowledge Base, opcionalmente filtrado por categoria',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'], description: 'Filtrar por categoria (opcional)' },
        },
      },
    },

    {
      name: 'kb_delete',
      description: 'Remove uma entrada da Knowledge Base',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['recipe', 'anti_pattern', 'ui_pattern', 'migration'] },
          filename: { type: 'string' },
        },
        required: ['category', 'filename'],
      },
    },
  ],
}));

// ─── EXECUÇÃO DAS FERRAMENTAS ────────────────────────────────────────────────

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {

      // ── BUSCA ──────────────────────────────────────────────────────────────

      case 'search_class': {
        const results = indexer.searchClass(args.name, args.version || 'both');
        if (!results.length) {
          return text(`Nenhuma classe encontrada com nome contendo "${args.name}"`);
        }
        const lines = results.map(r =>
          `📦 **${r.name}** (${r.version})\n` +
          `   Herda de: ${r.parent || '(nenhum)'}\n` +
          `   Métodos: ${r.methods?.length || 0}\n` +
          `   Arquivo: ${r.filePath}\n` +
          `   Linha: ${r.line}${r.isModded ? '\n   ⚠️  É um modded class' : ''}`
        );
        return text(`Encontrado(s) ${results.length} resultado(s):\n\n${lines.join('\n\n')}`);
      }

      case 'get_class_definition': {
        const result = indexer.getClassDefinition(args.name, args.version);
        if (!result) return text(`Classe "${args.name}" não encontrada na versão ${args.version}`);
        return text(
          `**${result.name}** — ${args.version}\n` +
          `Arquivo: ${result.filePath}\n\n` +
          `\`\`\`c\n${result.code || '(código não disponível)'}\n\`\`\``
        );
      }

      case 'search_text': {
        const results = indexer.searchText(args.query, args.version || '1.29');
        if (!results.length) return text(`Nenhum resultado para "${args.query}"`);
        const lines = results.map(r =>
          `📄 **${r.class}** (${r.version})\n` +
          r.hits.map(h => `   L${h.line}: \`${h.text}\``).join('\n')
        );
        return text(`${results.length} arquivo(s) com "${args.query}":\n\n${lines.join('\n\n')}`);
      }

      case 'search_layout': {
        const results = indexer.searchLayout(args.name, args.version || 'both');
        if (!results.length) return text(`Nenhum layout encontrado com "${args.name}"`);
        const lines = results.map(r =>
          `🖼️  **${r.file}** (${r.version})\n` +
          `   Widgets: ${r.widgets?.length || 0}\n` +
          `   Root: ${r.rootWidget?.name || r.rootWidget?.className || '?'}`
        );
        return text(`${results.length} layout(s):\n\n${lines.join('\n\n')}`);
      }

      // ── COMPARAÇÃO ─────────────────────────────────────────────────────────

      case 'compare_class': {
        const diff = indexer.compareClass(args.name);

        if (diff.status === 'NOT_FOUND') return text(`Classe "${args.name}" não encontrada em nenhuma versão.`);
        if (diff.status === 'ADDED_IN_129') return text(`✅ **${args.name}** foi ADICIONADA na 1.29 (não existe na 1.28)`);
        if (diff.status === 'REMOVED_IN_129') return text(`❌ **${args.name}** foi REMOVIDA na 1.29 (existia na 1.28)`);
        if (diff.status === 'UNCHANGED') return text(`✅ **${args.name}** está IGUAL nas duas versões`);

        const lines = [`## Comparação: ${args.name} (1.28 → 1.29)\n`];

        if (diff.parentChanged) {
          lines.push(`⚠️  **Herança mudou:** \`${diff.parent128}\` → \`${diff.parent129}\`\n`);
        }

        if (diff.removed.length) {
          lines.push(`### ❌ Métodos REMOVIDOS (${diff.removed.length})`);
          diff.removed.forEach(m => lines.push(`- \`${m.returnType} ${m.name}(${m.params})\` (linha ${m.line})`));
          lines.push('');
        }

        if (diff.added.length) {
          lines.push(`### ✅ Métodos ADICIONADOS (${diff.added.length})`);
          diff.added.forEach(m => lines.push(`- \`${m.returnType} ${m.name}(${m.params})\` (linha ${m.line})`));
          lines.push('');
        }

        if (diff.changed.length) {
          lines.push(`### ⚠️  Métodos com ASSINATURA ALTERADA (${diff.changed.length})`);
          diff.changed.forEach(c => {
            lines.push(`- **${c.old.name}**`);
            lines.push(`  - 1.28: \`${c.old.returnType} ${c.old.name}(${c.old.params})\``);
            lines.push(`  - 1.29: \`${c.new.returnType} ${c.new.name}(${c.new.params})\``);
          });
        }

        const impact = diff.removed.length > 3 || diff.changed.length > 3 ? '🔴 ALTO' :
                       diff.removed.length > 0 || diff.changed.length > 0 ? '🟠 MÉDIO' : '🟡 BAIXO';
        lines.push(`\n**Impacto estimado:** ${impact}`);

        return text(lines.join('\n'));
      }

      case 'list_changed_classes': {
        const changes = indexer.listChangedClasses();
        const filter  = args.filter || 'all';
        const lines   = [`## Classes alteradas entre 1.28 e 1.29\n`];

        if ((filter === 'all' || filter === 'removed') && changes.removed.length) {
          lines.push(`### ❌ Removidas da 1.29 (${changes.removed.length})`);
          changes.removed.forEach(n => lines.push(`- ${n}`));
          lines.push('');
        }

        if ((filter === 'all' || filter === 'added') && changes.added.length) {
          lines.push(`### ✅ Adicionadas na 1.29 (${changes.added.length})`);
          changes.added.forEach(n => lines.push(`- ${n}`));
          lines.push('');
        }

        if ((filter === 'all' || filter === 'modified') && changes.modified.length) {
          lines.push(`### ⚠️  Modificadas (${changes.modified.length})`);
          changes.modified.forEach(c =>
            lines.push(`- **${c.name}** — removidos: ${c.removedMethods}, adicionados: ${c.addedMethods}, alterados: ${c.changedMethods}`)
          );
        }

        return text(lines.join('\n'));
      }

      case 'get_stats': {
        const s = indexer.getStats();
        return text(
          `## Estatísticas do Índice PMZ DayZ\n\n` +
          `**1.28:** ${s['1.28'].classes} classes | ${s['1.28'].layouts} layouts | ${s['1.28'].files} arquivos\n` +
          `**1.29:** ${s['1.29'].classes} classes | ${s['1.29'].layouts} layouts | ${s['1.29'].files} arquivos`
        );
      }

      case 'rebuild_index': {
        indexer.ready = false;
        // Remove cache
        const { default: fs } = await import('fs');
        const { default: path } = await import('path');
        const cacheFile = path.join(config.cachePath, 'index.json');
        if (fs.existsSync(cacheFile)) fs.unlinkSync(cacheFile);
        await indexer.buildIndex();
        const s = indexer.getStats();
        return text(
          `✅ Índice reconstruído!\n` +
          `1.28: ${s['1.28'].classes} classes, ${s['1.28'].layouts} layouts\n` +
          `1.29: ${s['1.29'].classes} classes, ${s['1.29'].layouts} layouts`
        );
      }

      // ── KNOWLEDGE BASE ─────────────────────────────────────────────────────

      case 'kb_add': {
        const result = kb.add(args);
        return text(result.message);
      }

      case 'kb_update': {
        const result = kb.update(args);
        return text(result.message);
      }

      case 'kb_search': {
        const results = kb.search(args);
        if (!results.length) return text(`Nenhum resultado para "${args.query}" na Knowledge Base.`);
        const lines = results.map(r =>
          `📚 **[${r.category}] ${r.title}** (\`${r.filename}\`)\n` +
          r.preview.map(p => `   L${p.line}: ${p.text}`).join('\n')
        );
        return text(`${results.length} resultado(s):\n\n${lines.join('\n\n')}`);
      }

      case 'kb_get': {
        const result = kb.get(args);
        if (!result.success) return text(result.message);
        return text(result.content);
      }

      case 'kb_list': {
        const list  = kb.list({ category: args.category });
        const lines = [`## Knowledge Base PMZ\n`];
        for (const [cat, items] of Object.entries(list)) {
          if (!items.length) continue;
          const label = { recipe: '🍳 Receitas', anti_pattern: '🚫 Anti-Patterns', ui_pattern: '🖼️  UI Patterns', migration: '🔄 Migração' }[cat] || cat;
          lines.push(`### ${label} (${items.length})`);
          items.forEach(i => lines.push(`- **${i.title}** \`${i.filename}\` [${i.versions?.join(', ')}]`));
          lines.push('');
        }
        return text(lines.join('\n'));
      }

      case 'kb_delete': {
        const result = kb.delete(args);
        return text(result.message);
      }

      default:
        return text(`Ferramenta desconhecida: ${name}`);
    }

  } catch (err) {
    console.error(`[MCP] Erro na tool ${name}:`, err);
    return text(`❌ Erro: ${err.message}`);
  }
});

// Helper para retornar texto simples
function text(content) {
  return { content: [{ type: 'text', text: content }] };
}

// ─── START ───────────────────────────────────────────────────────────────────

async function main() {
  console.error('[MCP] PMZ DayZ MCP Server iniciando...');
  console.error(`[MCP] 1.28 path: ${config.dayz128Path}`);
  console.error(`[MCP] 1.29 path: ${config.dayz129Path}`);

  // Seed da knowledge base (só na primeira vez)
  kb.seed();

  // Indexa os scripts DayZ
  await indexer.buildIndex();

  // Inicia o servidor via stdio (compatível com VS Code + Claude Code)
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('[MCP] Servidor conectado e pronto ✅');
}

main().catch(err => {
  console.error('[MCP] Erro fatal:', err);
  process.exit(1);
});
