# 🎮 PMZ DayZ MCP Server

> **MCP (Model Context Protocol) Server** para desenvolvimento de mods DayZ — PandoraModz
> Indexa, busca e compara scripts Enforce (.c) e layouts GUI (.layout) entre versões do DayZ.

---

## 📋 O que é?

O **PMZ DayZ MCP** é um servidor MCP que atua como um **assistente inteligente para modders de DayZ**. Ele se conecta ao VS Code (via Claude Code ou outro cliente MCP compatível) e oferece ferramentas para:

- 🔍 **Buscar classes, métodos e textos** no código-fonte do DayZ
- 🔄 **Comparar versões** (1.28 vs 1.29) — detecta classes removidas, adicionadas e métodos com assinatura alterada
- 📚 **Knowledge Base** — base de conhecimento com receitas, anti-patterns e padrões de UI para modding DayZ
- 🖼️ **Buscar layouts GUI** — encontra e analisa arquivos `.layout` (widgets, estrutura XML)
- 📊 **Estatísticas** do índice (total de classes, layouts e arquivos por versão)

---

## 🏗️ Arquitetura

```
pmz-dayz-mcp/
├── index.js                          # 🚀 Ponto de entrada — registra todas as ferramentas MCP
├── package.json                      # Dependências e scripts
├── .vscode/
│   └── mcp.json                      # Configuração do servidor MCP para VS Code
└── src/
    ├── config.js                     # ⚙️ Configuração central (caminhos, extensões, cache)
    ├── indexer/
    │   ├── FileParser.js             # 🔧 Parser de arquivos .c (Enforce Script) e .layout (GUI)
    │   └── ScriptIndexer.js          # 📇 Indexador — varre pastas, constrói índice e cache
    ├── tools/
    │   └── KnowledgeBase.js          # 📚 CRUD da base de conhecimento em Markdown
    └── knowledge-base/
        ├── recipes/                  # 🍳 Receitas de código (como fazer X no DayZ)
        ├── anti_patterns/            # 🚫 Anti-patterns (erros comuns e como evitar)
        ├── ui_patterns/              # 🖼️ Padrões de UI/Layout
        └── migration_log/            # 🔄 Logs de migração entre versões
```

---

## 🛠️ Ferramentas Disponíveis

O servidor expõe **14 ferramentas** via protocolo MCP:

### 🔍 Busca de Código-Fonte

| Ferramenta | Descrição |
|---|---|
| `search_class` | Busca classes por nome (parcial ou completo) nas versões 1.28, 1.29 ou ambas |
| `get_class_definition` | Retorna o **código-fonte completo** de uma classe específica |
| `search_text` | Busca texto livre (métodos, variáveis, strings) nos arquivos `.c` |
| `search_layout` | Busca arquivos `.layout` da GUI por nome |

### 🔄 Comparação entre Versões

| Ferramenta | Descrição |
|---|---|
| `compare_class` | Compara uma classe entre 1.28 e 1.29 — mostra métodos removidos, adicionados e com assinatura alterada |
| `list_changed_classes` | Lista **todas** as classes que mudaram entre versões (removidas, adicionadas, modificadas) |
| `get_stats` | Estatísticas do índice (total de classes, layouts e arquivos) |
| `rebuild_index` | Força reindexação completa (usar ao atualizar os Scripts) |

### 📚 Knowledge Base

| Ferramenta | Descrição |
|---|---|
| `kb_add` | Adiciona uma nova entrada (receita, anti-pattern, UI pattern ou migração) |
| `kb_update` | Atualiza o conteúdo de uma entrada existente |
| `kb_search` | Busca na KB por texto, categoria ou tag |
| `kb_get` | Lê o conteúdo completo de uma entrada |
| `kb_list` | Lista todos os itens, opcionalmente filtrado por categoria |
| `kb_delete` | Remove uma entrada da Knowledge Base |

---

## 🚀 Como Instalar e Usar

### Pré-requisitos

- **Node.js** 18+ instalado
- Pastas com os **Scripts DayZ** descompactados (versões 1.28 e/ou 1.29)
- **VS Code** com extensão Claude Code (ou outro cliente MCP compatível)

### 1. Clonar o repositório

```bash
git clone https://github.com/kellyregis/PMZ_DayZ_MCP.git
cd PMZ_DayZ_MCP/pmz-dayz-mcp
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar os caminhos dos Scripts DayZ

Edite o arquivo `src/config.js` ou use **variáveis de ambiente**:

```bash
# Via variáveis de ambiente (recomendado)
set DAYZ_128_PATH=D:\SeuCaminho\DayZ_1.28
set DAYZ_129_PATH=D:\SeuCaminho\DayZ_1.29
```

A estrutura esperada dentro de cada pasta de versão:
```
1.28/
├── Scripts/          # Arquivos .c (Enforce Script)
│   ├── 1_Core/
│   ├── 2_GameLib/
│   ├── 3_Game/
│   ├── 4_World/
│   └── 5_Mission/
└── GUI/              # Arquivos .layout e .xml
```

### 4. Configurar no VS Code

Copie ou edite o arquivo `.vscode/mcp.json` no seu workspace:

```json
{
  "servers": {
    "pmz-dayz-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["D:\\Versoes_Dayz\\PMZ DayZ MCP\\pmz-dayz-mcp\\index.js"],
      "env": {
        "DAYZ_128_PATH": "D:\\Versoes_Dayz\\PMZ DayZ MCP\\1.28",
        "DAYZ_129_PATH": "D:\\Versoes_Dayz\\PMZ DayZ MCP\\1.29"
      }
    }
  }
}
```

> ⚠️ **Ajuste os caminhos** para refletir onde estão os seus arquivos!

### 5. Iniciar o servidor

```bash
# Produção
npm start

# Desenvolvimento (reinicia automaticamente ao salvar)
npm run dev

# Forçar reindexação
npm run index
```

---

## 💡 Exemplos de Uso

Após conectar o MCP ao seu editor, você pode pedir ao assistente IA:

### Buscar uma classe
> *"Busque a classe PlayerBase no DayZ 1.29"*
>
> → Usa `search_class` — retorna nome, herança, quantidade de métodos e caminho do arquivo

### Ver o código de uma classe
> *"Me mostra o código completo da classe ItemBase na versão 1.29"*
>
> → Usa `get_class_definition` — retorna o bloco de código-fonte inteiro

### Comparar entre versões
> *"O que mudou na classe PlayerBase entre 1.28 e 1.29?"*
>
> → Usa `compare_class` — lista métodos removidos ❌, adicionados ✅ e com assinatura alterada ⚠️

### Buscar texto no código
> *"Onde é usado GetBlood() nos scripts?"*
>
> → Usa `search_text` — encontra todas as referências com arquivo e linha

### Consultar a Knowledge Base
> *"Como buscar um player pelo SteamID?"*
>
> → Usa `kb_search` ou `kb_get` — retorna a receita com código pronto e avisos

### Listar todas as mudanças entre versões
> *"Quais classes foram removidas na 1.29?"*
>
> → Usa `list_changed_classes` com filtro `removed`

---

## 📚 Knowledge Base — Conteúdo Incluso

O servidor vem com conhecimento inicial pré-carregado:

### 🍳 Receitas
- **Buscar Player pelo SteamID** — código server-side com `GetPlainId()` e avisos sobre client vs server
- **Abrir Tela/Menu Customizado** — padrão `UIScriptedMenu` com layout e eventos de clique

### 🚫 Anti-Patterns
- **Criação de Diretórios Aninhados** — por que `MakeDirectory` falha silenciosamente e como criar nível por nível

### 🖼️ UI Patterns
- **Estrutura de arquivo .layout** — XML base, widgets disponíveis (ImageWidget, TextWidget, ButtonWidget, etc.) e sistema de posicionamento

> 💡 A Knowledge Base cresce ao longo do uso! O assistente pode adicionar novas receitas, anti-patterns e padrões conforme vocês trabalham no mod.

---

## ⚙️ Detalhes Técnicos

| Detalhe | Valor |
|---|---|
| **Protocolo** | MCP (Model Context Protocol) via stdio |
| **Runtime** | Node.js 18+ (ES Modules) |
| **Linguagem dos Scripts DayZ** | Enforce Script (`.c`) |
| **Layouts GUI** | XML (`.layout`, `.xml`) |
| **Cache** | JSON em `.cache/index.json` — válido por 24h, invalidado se caminhos mudarem |
| **Dependência principal** | `@modelcontextprotocol/sdk` ^1.0.0 |

### 🔧 Como o Parser funciona

O **FileParser** analisa arquivos Enforce Script (`.c`) usando regex para extrair:
- Definições de **classes** (incluindo `modded class`)
- **Herança** (`extends`)
- **Métodos** (tipo de retorno, nome, parâmetros, linha)
- **Enums**

Para layouts (`.layout`), extrai a árvore de **widgets** com seus atributos (name, className, etc.).

### 📇 Como o Indexador funciona

O **ScriptIndexer**:
1. Varre recursivamente as pastas `Scripts/` e `GUI/` de cada versão
2. Parseia cada arquivo com o `FileParser`
3. Armazena tudo em um índice em memória (HashMap por nome de classe)
4. Salva cache em disco (`.cache/index.json`) para acelerar próximos starts
5. Recarrega conteúdo dos arquivos ao restaurar do cache (para suportar diff e busca de texto)

---

## 🤝 Contribuição

Este projeto é desenvolvido pela equipe **PandoraModz (PMZ)** para uso interno no desenvolvimento de mods DayZ.

---

## 📄 Licença

Uso interno — PandoraModz.
