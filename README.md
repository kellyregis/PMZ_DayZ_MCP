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
PMZ_DayZ_MCP/
├── 1.28/                             # 📁 Scripts DayZ versão 1.28 (já incluídos no repo)
│   ├── Scripts/                      #     Arquivos .c (Enforce Script)
│   └── GUI/                          #     Arquivos .layout e .xml
├── 1.29/                             # 📁 Scripts DayZ versão 1.29 (já incluídos no repo)
│   ├── Scripts/
│   └── GUI/
└── pmz-dayz-mcp/                     # 🚀 Servidor MCP
    ├── index.js                      #     Ponto de entrada — registra todas as ferramentas MCP
    ├── package.json                  #     Dependências e scripts
    ├── .vscode/
    │   └── mcp.json                  #     Configuração do servidor MCP para VS Code
    └── src/
        ├── config.js                 # ⚙️ Configuração central (caminhos, extensões, cache)
        ├── indexer/
        │   ├── FileParser.js         # 🔧 Parser de arquivos .c (Enforce Script) e .layout (GUI)
        │   └── ScriptIndexer.js      # 📇 Indexador — varre pastas, constrói índice e cache
        ├── tools/
        │   └── KnowledgeBase.js      # 📚 CRUD da base de conhecimento em Markdown
        └── knowledge-base/
            ├── recipes/              # 🍳 Receitas de código (como fazer X no DayZ)
            ├── anti_patterns/        # 🚫 Anti-patterns (erros comuns e como evitar)
            ├── ui_patterns/          # 🖼️ Padrões de UI/Layout
            └── migration_log/        # 🔄 Logs de migração entre versões
```

> 📦 As pastas `1.28/` e `1.29/` já vêm incluídas no repositório com os scripts originais do DayZ, prontas para uso.

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

> ✅ As pastas `1.28/` e `1.29/` com os scripts originais do DayZ já vêm incluídas no repositório. Não é necessário baixá-las separadamente.

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar os caminhos dos Scripts DayZ

O servidor precisa saber onde estão as pastas `1.28/` e `1.29/`. Por padrão, ele aponta para o caminho original do projeto. Se você clonou em outro lugar, **ajuste os caminhos** de uma das formas abaixo:

#### Opção A — Variáveis de ambiente (recomendado) ✅

```bash
# Windows (cmd)
set DAYZ_128_PATH=C:\MeuCaminho\PMZ_DayZ_MCP\1.28
set DAYZ_129_PATH=C:\MeuCaminho\PMZ_DayZ_MCP\1.29

# Windows (PowerShell)
$env:DAYZ_128_PATH = "C:\MeuCaminho\PMZ_DayZ_MCP\1.28"
$env:DAYZ_129_PATH = "C:\MeuCaminho\PMZ_DayZ_MCP\1.29"

# Linux / macOS
export DAYZ_128_PATH=/home/user/PMZ_DayZ_MCP/1.28
export DAYZ_129_PATH=/home/user/PMZ_DayZ_MCP/1.29
```

#### Opção B — Editar `src/config.js` diretamente

Abra o arquivo `pmz-dayz-mcp/src/config.js` e altere os caminhos:

```js
dayz128Path: process.env.DAYZ_128_PATH || 'C:\\MeuCaminho\\PMZ_DayZ_MCP\\1.28',
dayz129Path: process.env.DAYZ_129_PATH || 'C:\\MeuCaminho\\PMZ_DayZ_MCP\\1.29',
```

#### 📁 Estrutura esperada dentro de cada pasta de versão

```
1.28/  (ou 1.29/)
├── Scripts/              # Arquivos .c (Enforce Script)
│   ├── 1_Core/
│   ├── 2_GameLib/
│   ├── 3_Game/
│   ├── 4_World/
│   └── 5_Mission/
└── GUI/                  # Arquivos .layout e .xml
```

### 4. Configurar no VS Code

Copie ou edite o arquivo `.vscode/mcp.json` no seu workspace. **Ajuste os caminhos** para onde você clonou o repositório:

```json
{
  "servers": {
    "pmz-dayz-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:\\MeuCaminho\\PMZ_DayZ_MCP\\pmz-dayz-mcp\\index.js"],
      "env": {
        "DAYZ_128_PATH": "C:\\MeuCaminho\\PMZ_DayZ_MCP\\1.28",
        "DAYZ_129_PATH": "C:\\MeuCaminho\\PMZ_DayZ_MCP\\1.29"
      }
    }
  }
}
```

> ⚠️ **Importante:** Os 3 caminhos (`args`, `DAYZ_128_PATH` e `DAYZ_129_PATH`) devem apontar para onde você clonou o repositório!

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

## 🔄 Atualizando as Pastas de Versões do DayZ

As pastas `1.28/` e `1.29/` contêm o código-fonte (EnScript) extraído de cada versão do DayZ.

### Onde conseguir os scripts

Os scripts ficam dentro da instalação do DayZ no Steam:
```
Steam\steamapps\common\DayZ\dta\scripts.pbo
```
Use o **PBO Manager** ou **DayZ Tools** para extrair o conteúdo do `scripts.pbo`.

### Atualizar uma versão existente

1. Extraia o novo `scripts.pbo` da versão atualizada do DayZ
2. Substitua o conteúdo da pasta correspondente (ex: `1.29/scripts/`)
3. Se houver novos layouts GUI, atualize também `1.29/gui/`
4. No Claude, peça para reconstruir o índice:
   > *"Reconstrua o índice do MCP"* — isso executa a tool `rebuild_index`

### Adicionar uma nova versão (ex: 1.30)

1. Crie a pasta na raiz do projeto:
```bash
mkdir -p 1.30/scripts 1.30/gui
```

2. Extraia os scripts e layouts do DayZ 1.30 para dentro dessa pasta

3. Atualize os caminhos — adicione a nova variável de ambiente nos arquivos de configuração MCP:

**No `.mcp.json` (raiz do projeto):**
```json
{
  "mcpServers": {
    "pmz-dayz-mcp": {
      "env": {
        "DAYZ_128_PATH": "D:\\caminho\\1.28",
        "DAYZ_129_PATH": "D:\\caminho\\1.29",
        "DAYZ_130_PATH": "D:\\caminho\\1.30"
      }
    }
  }
}
```

**No `src/config.js`:**
```js
dayz130Path: process.env.DAYZ_130_PATH || 'D:\\Versoes_Dayz\\PMZ DayZ MCP\\1.30',
```

4. Atualize o `ScriptIndexer.js` e `index.js` para indexar a nova versão

5. Reinicie o servidor MCP (recarregue o VSCode: `Ctrl+Shift+P` > "Reload Window")

6. Use `rebuild_index` para indexar a nova versão

> **Dica:** Se configurou o MCP globalmente, lembre-se de atualizar também o `~/.claude/settings.json` e o `User Settings` do VSCode.

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
