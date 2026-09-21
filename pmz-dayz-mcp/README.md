# PMZ DayZ MCP — Knowledge Server (v2)

Servidor MCP que dá ao Claude conhecimento **factual e rastreável** do DayZ 1.29 (e 1.28 para diff): API de script, hierarquia de configs, hooks de modding e uma Knowledge Base conceitual. Toda resposta rastreia a `arquivo:linha` do vanilla ou a um doc curado — **mecanismo, não achismo**.

Reestruturação sobre `PMZ_DAYZ_MCP_PLAN.md`. Auditoria da versão anterior em `../AUDIT_MCP_ATUAL.md`.

## O que mudou da v1 → v2

| | v1 (antiga) | v2 (esta) |
|---|---|---|
| Parser | regex (ignorava herança `:` — 2.599 classes; `parent` nulo) | **declaration extractor** tokenizado (98,6% de herança capturada) |
| Storage | JSON em memória (2,5 MB, O(N) por query) | **SQLite + FTS5** (índices, herança relacional, <50 ms) |
| Herança | não modelada | grafo `inheritance` + flatten na consulta |
| Config | inexistente | parser class-tree de `config.cpp` + flatten |
| Tools | payload despejava classe inteira | 13 tools cirúrgicas (assinaturas, range, paginação) |
| KB | busca por substring | 12 docs curados + FTS5 + resources |

## Setup

```bash
cd pmz-dayz-mcp
npm install                 # better-sqlite3 (compila nativo), zod, sdk
node src/ingest/cli.js index   # constrói data/dayz.db (~3 min p/ 1.28 + 1.29)
```

Variáveis de ambiente (também no `../.mcp.json`):
- `PMZ_DAYZ_DB` — caminho do `.db` (default `data/dayz.db`).
- `DAYZ_129_PATH` / `DAYZ_128_PATH` — raízes das versões (contêm `scripts/` e opcionalmente `bin/config.cpp`).
- `PMZ_DAYZ_DEFAULT_VERSION` — versão default das tools (default `1.29`).

O servidor (`index.js`) só **lê** o `.db`; nunca parseia em runtime. Reindexação é feita pela CLI.

### Reindexar após um patch do jogo (incremental por hash)
```bash
node src/ingest/cli.js index --incremental   # só processa arquivos com sha1 alterado
```

## As 13 tools (`dayz_*`)

| Tool | Para quê |
|---|---|
| `dayz_search_symbol` | busca classe/método/membro/enum/função por nome |
| `dayz_get_class` | classe completa (pai, filhos, membros, métodos, modded_by); `include_inherited` traz a cadeia |
| `dayz_inheritance_chain` | ancestrais/descendentes com `file:line` |
| `dayz_get_method` | assinatura + params + overloads/overrides |
| `dayz_get_source` | trecho de código por `file` + range (máx. 200 linhas) |
| `dayz_find_references` | onde é usado (`extends`/`new`), paginado |
| `dayz_list_hooks` | métodos overridáveis (EEInit, OnStoreSave, OnRPC, SetActions…) + doc curto |
| `dayz_get_config_class` | config com herança achatada + origem de cada param |
| `dayz_config_search` | busca em config por classe/param/valor |
| `dayz_kb_search` | Knowledge Base conceitual |
| `dayz_semantic_search` | NL sobre código+docs (FTS) |
| `dayz_api_diff` | diff de API 1.28 → 1.29 |
| `dayz_index_status` | saúde/contagens do índice |

Também: **resources** `dayz://docs/{doc_id}` e `dayz://index/status`; **prompts** `recipe_persistent_item`, `recipe_rpc_secure`, `recipe_custom_action`, `recipe_modded_class`.

## Testes
```bash
npm run test:parser     # 14 golden-lite do extractor (herança :/extends, generics, proto native, enum, máscara…)
node test/e2e.mjs       # sobe o servidor via stdio e chama tools reais
```

## Arquitetura
```
src/
  parser/enscript.js   # declaration extractor (máscara → tokens → parser de declaração)
  parser/config.js     # class-tree de config.cpp (+ #define)
  db/schema.sql        # símbolos, herança, refs, config, docs, FTS5
  db/database.js       # better-sqlite3 + PRAGMAs (WAL, mmap)
  db/queries.js        # herança flatten, config resolve, refs paginadas, FTS
  ingest/index.js      # discover + sha1 + parse + resolve + store (incremental)
  ingest/cli.js        # `pmz-dayz-mcp index`
  tools/index.js       # 13 tools (Zod)
  prompts/index.js     # recipes de modding
  kb/*.md              # 12 docs curados (§4.4) + kb/index.js (indexador)
  knowledge-base/**    # docs legados PMZ (preservados e indexados)
  server.js            # McpServer stdio
```

## Notas de cobertura
- Índice 1.29: 6.075 classes / 28.664 métodos / 402 enums / 1.176 config classes; 1.28: 5.975 / 28.227. 0 arquivos degraded.
- `bin/config.cpp` cobre CfgVehicles/CfgWeapons/CfgAmmo/CfgMagazines base. Configs de itens de PBOs de dados adicionais (ex.: `AKM` completo) exigem derapificar (`CfgConvert -txt`) e apontar `--root` para a pasta com esse `config.cpp`.
- Busca semântica usa FTS5 (sem embeddings no v1 — `.db` leve e portátil).
