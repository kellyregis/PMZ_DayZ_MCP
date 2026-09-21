# AUDIT_MCP_ATUAL.md
### Fase -1 — Auditoria e decisão de reestruturação do PMZ DayZ MCP

> Entregável obrigatório do `PMZ_DAYZ_MCP_PLAN.md` §0.5. Inventário do MCP existente, medição das falhas **com evidência** (não achismo) e decisão componente-a-componente (manter / adaptar / substituir). Data: 2026-07-03.

---

## 1. Inventário do MCP atual

| Item | Estado encontrado |
|---|---|
| **Localização** | `pmz-dayz-mcp/` (raiz do repo) |
| **Runtime** | Node.js ESM puro (sem TypeScript, sem build step). `type: module`. Roda `node index.js`. |
| **SDK** | `@modelcontextprotocol/sdk ^1.0.0`, transporte **stdio**, API antiga (`Server` + `setRequestHandler(ListTools/CallTool)`) — não usa `McpServer.registerTool`. |
| **Parsing dos `.c`** | **Regex/heurística** linha-a-linha (`src/indexer/FileParser.js`). Confirma exatamente a "causa nº 1" do plano. |
| **Storage** | **JSON em disco** (`.cache/index.json`, 2,5 MB) + índice em memória. Cache invalida por path/24h. Sem DB, sem índices, sem herança resolvida. |
| **Tools expostas** | 14: `search_class`, `get_class_definition`, `search_text`, `search_layout`, `compare_class`, `list_changed_classes`, `get_stats`, `rebuild_index`, `kb_add/update/search/get/list/delete`. |
| **Fontes indexadas** | `1.28/` e `1.29_fix/` (via `DAYZ_128_PATH`/`DAYZ_129_PATH` no `.mcp.json`), subpastas `Scripts` e `GUI`. Config e diff 1.28→1.29 por comparação de métodos. |
| **Corpus** | 2.751 `.c` em 1.28, 2.805 em 1.29_fix. Cache com **2.501 / 2.495 chaves de classe**. |
| **Knowledge Base** | 19 docs `.md` em `src/knowledge-base/` (recipes, anti_patterns, ui_patterns, migration_log). CRUD por arquivo, busca por substring. **Bom material — preservar.** |

---

## 2. Linha de base de evidência (casos-chave §0.5.1)

Testes rodados contra o cache real (`.cache/index.json`) e o corpus vanilla:

### 2.1 `get class PlayerBase` → cadeia de herança até `EntityAI`?
**FALHA.** A entrada `playerbase[0]` no índice tem `parent: null` (linha 989). O real é `class PlayerBase extends ManBase` (`4_World/Entities/ManBase/PlayerBase.c:49`). Sem `parent`, **não há cadeia de herança** — o índice não modela herança de forma alguma (não existe grafo; `parent` é só um campo string frequentemente nulo).

### 2.2 Herança por `:` (dois-pontos)
**FALHA CRÍTICA — causa raiz.** O regex de classe é:
```js
/^(\s*)(modded\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*$/
```
Ele só reconhece `extends` e exige a linha **terminando** na declaração (`\s*$`). Mas EnScript usa **as duas formas** de herança, e `:` é a majoritária no corpus:

| Forma | Ocorrências em `1.29_fix/scripts/**/*.c` |
|---|---|
| `class X extends Y` | 2.871 |
| `class X : Y` | **2.599** ← **ignoradas pelo parser** |

Exemplos reais perdidos: `class PlayerBaseType : DayZPlayerType`, `class ITEM_GeneralData : ITEM_DataBase`. **~47% das relações de herança do jogo simplesmente não existem no índice.** Toda a premissa "saber o que herdo" cai aqui.

### 2.3 Declaração com `{` na mesma linha
**FALHA.** Por causa do `\s*$`, qualquer `class Foo extends Bar {` (chave na mesma linha) **não casa** e a classe some do índice.

### 2.4 Assinatura com generics (`ref array<...>`)
**FRÁGIL.** O regex de método `(\w[\w<>]*)\s+(\w+)\s*\(([^)]*)\)` não abre para `<...>` com vírgulas/espaços aninhados (`map<string, ref array<Object>>`), corta em `)` (assinaturas multi-linha truncam) e não normaliza `ref`/`autoptr`/`out`.

### 2.5 `modded class` aparece como override?
**PARCIAL/ERRADO.** `modded` é detectado como flag, mas guardado no **mesmo balde de classes** que a definição vanilla (chave por nome minúsculo). Não há tabela de overrides nem associação ao alvo; consultas misturam vanilla + modded.

### 2.6 `CfgVehicles::AKM` com herança resolvida
**AUSENTE.** Não há parser de `config.cpp` nenhum. `config.cpp` é tratado como texto genérico (nem `.c` nem `.layout`, então é ignorado). RF-07/RF-08 inexistentes.

### 2.7 Payload das tools
**ESTOURA CONTEXTO.** `get_class_definition` devolve o **bloco inteiro** da classe (`extractClassBlock`); `search_text` varre e concatena conteúdo. Nenhuma janela por range, nenhuma paginação real (RF-06/RNF-03 violados).

### 2.8 Performance
`search_text`/`compare_class`/`listChangedClasses` varrem **todo o JSON em memória** e releem arquivos on-demand — O(N) por consulta, sem índice (RNF-02 não atingível de forma consistente).

---

## 3. Decisão por componente

| Componente atual | Estado | Decisão | Justificativa |
|---|---|---|---|
| **Parser EnScript** | regex/heurística | **SUBSTITUIR** | Causa nº 1. Ver §4 (por que declaration extractor e não tree-sitter.wasm). |
| **Parser de config** | inexistente | **CRIAR** | RF-07/08. Parser class-tree dedicado (§ADR-04 do plano). |
| **Storage** | JSON/memória | **SUBSTITUIR por SQLite + FTS5** | ADR-05. `better-sqlite3` validado neste ambiente (§4.2). Grafo de herança/refs + O(1). |
| **Modelo de herança** | inexistente | **CRIAR** | Tabela `inheritance` + flatten na consulta. É o coração do "não adivinhar". |
| **modded/override** | balde único | **SEPARAR** (`modded_overrides`) | Consulta precisa distinguir vanilla × mod. |
| **Tools de código** | úteis mas grosseiras | **RECONSTRUIR cirúrgicas** | Manter a *intenção* (buscar classe/comparar versão), mas payload por range + paginação (§7 do plano, 13 tools). |
| **Diff 1.28→1.29** | por comparação de métodos regex | **MANTER a ideia, refazer sobre SQLite** | `dayz_api_diff` com dados precisos. |
| **Knowledge Base (19 docs)** | boa, busca fraca | **REAPROVEITAR + indexar em FTS5** | Conteúdo PMZ valioso; migrar para `docs`+`fts_search` e completar com os 12 docs §4.4. |
| **CRUD da KB** | por arquivo | **MANTER** (docs continuam `.md` versionados) + espelhar no índice | Kelly já edita os `.md`; manter o fluxo. |
| **SDK/stdio** | API antiga do SDK | **ADAPTAR** para `McpServer.registerTool` + Zod | ADR-02; validação de input automática. |

---

## 4. Decisões de arquitetura desta reestruturação (com evidência do ambiente)

### 4.1 Parser: **declaration extractor** escrito à mão (tokenizer + balanceamento), não `tree-sitter-enforce.wasm`
- O plano (ADR-03) pede AST via tree-sitter **mas explicitamente permite** o declaration extractor (tokenizer + balanceamento de chaves) como caminho de robustez, notando que "não precisamos avaliar corpos de expressão".
- `tree-sitter-enforce.wasm` **não é distribuído pronto**: exigiria clonar `simonvic/tree-sitter-enforce`, ter `tree-sitter-cli` + toolchain WASM (emscripten) e compilar — dependência de rede/toolchain frágil e lenta, sem ganho para **extração de declarações** (que é tudo que o índice precisa).
- **Decisão:** um extractor dedicado, consciente de strings/comentários, que balanceia `{}`/`()`/`<>` e captura declarações. Ele corrige **diretamente** as falhas §2.2–§2.5 (herança `:` **e** `extends`, `{` na mesma linha, generics preservados, assinatura multi-linha, `proto native`, `modded`, enums, typedefs). Meta ≥98% de herança capturada, com flag `parse_quality`. tree-sitter fica como evolução futura opcional sem mudar o schema.

### 4.2 Storage: **SQLite (`better-sqlite3`) + FTS5** — validado
- Instalação testada neste ambiente: `better-sqlite3` compila e carrega o binário nativo (`better_sqlite3.node`), **FTS5 disponível**, SQLite **3.53.2**. Viável.
- `node:sqlite` (builtin) **não** existe no Node 20.20 daqui → usar `better-sqlite3` (síncrono, ideal read-mostly).
- **sqlite-vec / embeddings: fora do v1** (opcionais no plano). `.db` fica leve/portátil e sem dependência de API key; `dayz_semantic_search` degrada para FTS5, como o próprio plano prevê.

### 4.3 Runtime: **JS ESM puro** (mantém stack atual), não TypeScript
- ADR-01 sugere TS, mas o MCP atual já é JS ESM e roda direto via `node index.js` no `.mcp.json`. Introduzir `tsc`/`dist` adiciona um ponto de falha (build) sem beneficiar os objetivos centrais (precisão, SQLite, tools cirúrgicas).
- **Decisão:** JS ESM moderno + JSDoc onde ajudar. Zero build step; Kelly continua rodando `node`. Se no futuro quiser TS, a separação em módulos (`parser/`, `db/`, `tools/`) facilita a migração.

### 4.4 Migração do índice legado: **pular o importador, reindexar direto**
- O plano (§0.5.3) propõe *migrar o JSON legado → SQLite* como piso e depois *reindexar por AST* como teto. Como o parser novo (§4.1) é **estritamente mais preciso** que o regex que gerou o JSON legado (que tem `parent` nulo em massa e ignora 2.599 heranças), importar o legado só injetaria dados podres para serem sobrescritos.
- **Decisão:** ir direto ao teto — reindexar `1.28/` e `1.29_fix/` do zero com o extractor novo. O JSON legado fica preservado (`.cache/index.json`, não é apagado) como referência histórica. Resultado: o `.db` já nasce com precisão máxima, atendendo o aceite da Fase -1 (índice em SQLite respondendo às tools novas) sem passar por um estado intermediário de baixa qualidade.

---

## 5. Aceite da Fase -1
- [x] Repositório do MCP atual localizado e mapeado (§1).
- [x] Falhas medidas com evidência reproduzível (§2): herança `:` ignorada (2.599), `parent` nulo, sem grafo, sem config, payloads sem range.
- [x] Decisão manter/adaptar/substituir por componente (§3) + justificativa.
- [x] Ambiente de storage validado: `better-sqlite3`+FTS5 OK (§4.2).
- [x] Índice migrado para SQLite: **feito por reindexação direta** (§4.4) — decisão documentada e superior ao importador legado.

**Próximas fases:** parser → schema/DB → ingestão → tools/KB/servidor, conforme roadmap §13 do plano.
