// src/tools/index.js — definição das 13 tools MCP (§7 do plano).
// Cada tool: {name, description, schema (Zod raw shape), handler(queries, args)}.
import { z } from 'zod';

const versionArg = z.string().optional().describe('Versão do DayZ (ex: 1.29, 1.28). Default = versão do servidor.');

// util p/ retornar JSON compacto como texto
export function json(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}
function notFound(msg, extra) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: msg, ...(extra || {}) }, null, 2) }], isError: false };
}

export function buildTools(queries) {
  const Q = queries;
  return [
    {
      name: 'dayz_search_symbol',
      description: 'Busca símbolo (classe, método, membro, enum, função, typedef) por nome exato/parcial. Retorna lista compacta com file:line.',
      schema: {
        query: z.string().describe('Nome ou parte do nome do símbolo'),
        kind: z.enum(['class', 'method', 'member', 'enum', 'enum_value', 'function', 'typedef', 'const']).optional(),
        limit: z.number().int().min(1).max(50).optional().default(25),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.searchSymbol(a.query, { kind: a.kind, limit: a.limit, version: a.version });
        if (!r.length) return notFound(`Nenhum símbolo para "${a.query}"`);
        return json({ count: r.length, results: r });
      },
    },
    {
      name: 'dayz_get_class',
      description: 'Definição completa de uma classe: pai, filhos, membros, métodos (assinaturas, NÃO corpos), overrides modded, file:line. Use include_inherited para trazer membros/métodos herdados da cadeia.',
      schema: {
        name: z.string(),
        include_inherited: z.boolean().optional().default(false),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.getClass(a.name, { includeInherited: a.include_inherited, version: a.version });
        if (!r) {
          const sug = Q.searchSymbol(a.name, { kind: 'class', limit: 6, version: a.version }).map(s => s.name);
          return notFound(`Classe "${a.name}" não encontrada`, { suggestions: sug });
        }
        return json(r);
      },
    },
    {
      name: 'dayz_inheritance_chain',
      description: 'Cadeia de herança: ancestrais (up) e/ou descendentes (down) de uma classe, com file:line.',
      schema: {
        name: z.string(),
        direction: z.enum(['up', 'down', 'both']).optional().default('up'),
        depth: z.number().int().min(1).max(40).optional().default(30),
        version: versionArg,
      },
      handler: (a) => json(Q.inheritanceChain(a.name, { direction: a.direction, depth: a.depth, version: a.version })),
    },
    {
      name: 'dayz_get_method',
      description: 'Método por nome (opcionalmente de uma classe): assinatura, params, overloads/overrides, modded_by, file:line. Sem classe, lista o método em todas as classes que o declaram.',
      schema: {
        method: z.string(),
        class: z.string().optional(),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.getMethod(a.method, { className: a.class, version: a.version });
        if (!r) return notFound(`Método "${a.method}"${a.class ? ' em ' + a.class : ''} não encontrado`);
        return json({ method: a.method, overloads: r.length, declarations: r });
      },
    },
    {
      name: 'dayz_get_source',
      description: 'Lê um trecho de código-fonte vanilla por arquivo + range de linhas (janela máx. 200 linhas). Use para ver o corpo de um método.',
      schema: {
        file: z.string().describe('Caminho do arquivo (relativo ao índice; sufixo aceito)'),
        line_start: z.number().int().min(1),
        line_end: z.number().int().min(1),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.getSource(a.file, a.line_start, a.line_end, { version: a.version });
        if (!r) return notFound(`Arquivo "${a.file}" não encontrado no índice`);
        return { content: [{ type: 'text', text: `// ${r.file} (L${r.line_start}-${r.line_end})\n${r.code}` }] };
      },
    },
    {
      name: 'dayz_find_references',
      description: 'Onde um símbolo é usado (extends, new, modded). Paginado (25/página).',
      schema: {
        name: z.string(),
        ref_kind: z.enum(['extends', 'new', 'modded', 'call', 'type_use']).optional(),
        page: z.number().int().min(1).optional().default(1),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.findReferences(a.name, { refKind: a.ref_kind, page: a.page, version: a.version });
        return json(r);
      },
    },
    {
      name: 'dayz_list_hooks',
      description: 'Métodos overridáveis (hooks de modding) da classe e sua cadeia: EEInit, OnStoreSave/Load, OnRPC, SetActions, EEKilled, etc, com doc curto.',
      schema: { class: z.string(), version: versionArg },
      handler: (a) => {
        const r = Q.listHooks(a.class, { version: a.version });
        return json(r);
      },
    },
    {
      name: 'dayz_get_config_class',
      description: 'Config resolvido (CfgVehicles/CfgWeapons/...): parâmetros com herança achatada (flatten) e origem de cada param (inherited_from).',
      schema: {
        name: z.string(),
        root: z.string().optional().describe('CfgVehicles, CfgWeapons, CfgMagazines...'),
        resolve_inheritance: z.boolean().optional().default(true),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.getConfigClass(a.name, { root: a.root, resolveInheritance: a.resolve_inheritance, version: a.version });
        if (!r) return notFound(`Config class "${a.name}" não encontrada`);
        return json(r);
      },
    },
    {
      name: 'dayz_config_search',
      description: 'Busca em config por classe, parâmetro (key) ou valor.',
      schema: {
        query: z.string(),
        root: z.string().optional(),
        by: z.enum(['class', 'param', 'value']).optional().default('class'),
        limit: z.number().int().min(1).max(50).optional().default(25),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.configSearch(a.query, { root: a.root, by: a.by, limit: a.limit, version: a.version });
        return json({ count: r.length, by: a.by, results: r });
      },
    },
    {
      name: 'dayz_kb_search',
      description: 'Busca na Knowledge Base conceitual PMZ (persistência, RPC, actions, inventário, ciclo de vida, config, CE, P3D/LOD, RVMat, UI, pitfalls, camadas). Retorna trechos.',
      schema: {
        query: z.string(),
        subsystem: z.string().optional(),
        limit: z.number().int().min(1).max(20).optional().default(8),
      },
      handler: (a) => {
        const r = Q.kbSearch(a.query, { subsystem: a.subsystem, limit: a.limit });
        if (!r.length) return notFound(`Nada na KB para "${a.query}"`);
        return json({ count: r.length, results: r });
      },
    },
    {
      name: 'dayz_semantic_search',
      description: 'Busca em linguagem natural sobre código + docs (FTS). scope: code|docs|all.',
      schema: {
        query: z.string(),
        scope: z.enum(['code', 'docs', 'all']).optional().default('all'),
        limit: z.number().int().min(1).max(20).optional().default(10),
        version: versionArg,
      },
      handler: (a) => {
        const r = Q.semanticSearch(a.query, { scope: a.scope, limit: a.limit, version: a.version });
        if (!r.length) return notFound(`Nada para "${a.query}"`);
        return json({ count: r.length, results: r });
      },
    },
    {
      name: 'dayz_api_diff',
      description: 'Diff de API entre versões (ex: 1.28 → 1.29): classes adicionadas/removidas; se name for dado, diff de métodos daquela classe.',
      schema: {
        from: z.string().default('1.28'),
        to: z.string().default('1.29'),
        name: z.string().optional(),
        kind: z.enum(['class']).optional().default('class'),
      },
      handler: (a) => json(Q.apiDiff(a.from, a.to, { name: a.name, kind: a.kind })),
    },
    {
      name: 'dayz_index_status',
      description: 'Saúde/meta do índice: versões, contagens (classes/métodos/config/docs), arquivos degraded, indexed_at.',
      schema: {},
      handler: () => json(Q.indexStatus()),
    },
  ];
}

export default { buildTools, json };
