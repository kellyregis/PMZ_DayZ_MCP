// src/tools/KnowledgeBase.js
// Gerencia a base de conhecimento PMZ — receitas, anti-patterns, migração, UI

import fs   from 'fs';
import path from 'path';
import { config } from '../config.js';

const CATEGORIES = {
  recipe:       'recipes',
  anti_pattern: 'anti_patterns',
  ui_pattern:   'ui_patterns',
  migration:    'migration_log',
};

export class KnowledgeBase {

  constructor() {
    this.basePath = config.knowledgeBasePath;
    this._ensureDirs();
  }

  _ensureDirs() {
    for (const dir of Object.values(CATEGORIES)) {
      const full = path.join(this.basePath, dir);
      if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
    }
  }

  _categoryPath(category) {
    const dir = CATEGORIES[category] || category;
    return path.join(this.basePath, dir);
  }

  // ─── ADICIONAR ─────────────────────────────────────────────────────────────

  add({ category, title, filename, content, tags = [], versions = ['1.28', '1.29'] }) {
    const dir      = this._categoryPath(category);
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(dir, safeName);

    const header = [
      `# ${title}`,
      ``,
      `**Categoria:** ${category}`,
      `**Versões:** ${versions.join(', ')}`,
      `**Tags:** ${tags.join(', ') || 'nenhuma'}`,
      `**Adicionado em:** ${new Date().toLocaleDateString('pt-BR')}`,
      ``,
      `---`,
      ``,
    ].join('\n');

    fs.writeFileSync(filePath, header + content, 'utf8');

    return { success: true, path: filePath, message: `✅ Salvo em: ${safeName}` };
  }

  // ─── ATUALIZAR ──────────────────────────────────────────────────────────────

  update({ category, filename, content }) {
    const dir      = this._categoryPath(category);
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(dir, safeName);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `❌ Arquivo não encontrado: ${safeName}` };
    }

    // Preserva o cabeçalho, substitui o conteúdo após ---
    const existing = fs.readFileSync(filePath, 'utf8');
    const sepIdx   = existing.indexOf('\n---\n');
    const header   = sepIdx >= 0 ? existing.slice(0, sepIdx + 5) : '';

    fs.writeFileSync(filePath, header + content, 'utf8');
    return { success: true, message: `✅ Atualizado: ${safeName}` };
  }

  // ─── BUSCAR ────────────────────────────────────────────────────────────────

  search({ query, category = null }) {
    const results = [];
    const q       = query.toLowerCase();

    const dirs = category
      ? [{ cat: category, dir: this._categoryPath(category) }]
      : Object.entries(CATEGORIES).map(([cat, dir]) => ({ cat, dir: path.join(this.basePath, dir) }));

    for (const { cat, dir } of dirs) {
      if (!fs.existsSync(dir)) continue;

      for (const file of fs.readdirSync(dir)) {
        if (!file.endsWith('.md')) continue;

        const filePath = path.join(dir, file);
        const content  = fs.readFileSync(filePath, 'utf8');

        if (content.toLowerCase().includes(q)) {
          // Extrai título (primeira linha com #)
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title      = titleMatch ? titleMatch[1] : file;

          // Extrai trecho relevante (até 3 linhas ao redor do match)
          const lines    = content.split('\n');
          const hitLines = [];
          lines.forEach((line, i) => {
            if (line.toLowerCase().includes(q)) hitLines.push({ line: i + 1, text: line.trim() });
          });

          results.push({
            category: cat,
            filename: file,
            title,
            preview: hitLines.slice(0, 3),
          });
        }
      }
    }

    return results;
  }

  // ─── LER ───────────────────────────────────────────────────────────────────

  get({ category, filename }) {
    const dir      = this._categoryPath(category);
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(dir, safeName);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `❌ Não encontrado: ${safeName}` };
    }

    return {
      success:  true,
      filename: safeName,
      category,
      content:  fs.readFileSync(filePath, 'utf8'),
    };
  }

  // ─── LISTAR ────────────────────────────────────────────────────────────────

  list({ category = null }) {
    const result = {};

    const dirs = category
      ? { [category]: this._categoryPath(category) }
      : Object.fromEntries(Object.entries(CATEGORIES).map(([cat, dir]) => [cat, path.join(this.basePath, dir)]));

    for (const [cat, dir] of Object.entries(dirs)) {
      if (!fs.existsSync(dir)) { result[cat] = []; continue; }

      result[cat] = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .map(file => {
          const content    = fs.readFileSync(path.join(dir, file), 'utf8');
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const tagsMatch  = content.match(/\*\*Tags:\*\*\s+(.+)$/m);
          const verMatch   = content.match(/\*\*Versões:\*\*\s+(.+)$/m);
          return {
            filename: file,
            title:    titleMatch ? titleMatch[1] : file,
            tags:     tagsMatch  ? tagsMatch[1].split(',').map(t => t.trim()) : [],
            versions: verMatch   ? verMatch[1].split(',').map(v => v.trim()) : [],
          };
        });
    }

    return result;
  }

  // ─── DELETAR ───────────────────────────────────────────────────────────────

  delete({ category, filename }) {
    const dir      = this._categoryPath(category);
    const safeName = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(dir, safeName);

    if (!fs.existsSync(filePath)) {
      return { success: false, message: `❌ Não encontrado: ${safeName}` };
    }

    fs.unlinkSync(filePath);
    return { success: true, message: `🗑️ Deletado: ${safeName}` };
  }

  // ─── SEED (conhecimento inicial) ───────────────────────────────────────────

  seed() {
    // Adiciona receitas iniciais se a KB estiver vazia
    const recipesDir = path.join(this.basePath, 'recipes');
    if (fs.readdirSync(recipesDir).filter(f => f.endsWith('.md')).length > 0) return;

    console.error('[MCP] Adicionando conhecimento inicial à Knowledge Base...');

    this.add({
      category: 'recipe',
      title:    'Buscar Player pelo SteamID',
      filename: 'find_player_by_steamid',
      tags:     ['player', 'steamid', 'identity', 'server'],
      versions: ['1.28', '1.29'],
      content: `
## Código

\`\`\`c
PlayerBase PMZ_GetPlayerBySteamId(string steamId)
{
    array<Man> players = new array<Man>();
    GetGame().GetWorld().GetPlayerList(players);

    foreach (Man man : players)
    {
        PlayerIdentity identity = man.GetIdentity();
        if (identity && identity.GetPlainId() == steamId)
            return PlayerBase.Cast(man);
    }
    return null;
}
\`\`\`

## Onde usar
Sempre no **SERVER SIDE** (4_World ou 5_Mission lado servidor).

## Avisos importantes
- Usar \`GetPlainId()\` e NÃO \`GetId()\` — GetId() inclui prefixo
- GetPlayerList() retorna lista vazia no CLIENT SIDE
- Sempre verificar se o retorno não é null antes de usar

## Anti-pattern
\`\`\`c
// ❌ ERRADO — chamar no 3_Game (client side)
PlayerBase player = PMZ_GetPlayerBySteamId("123"); // sempre null no cliente
\`\`\`
`,
    });

    this.add({
      category: 'recipe',
      title:    'Abrir Tela / Menu Customizado',
      filename: 'open_custom_screen',
      tags:     ['UI', 'screen', 'menu', 'UIScriptedMenu'],
      versions: ['1.28', '1.29'],
      content: `
## Código Base — Abrir e Fechar

\`\`\`c
// Abrir a tela
GetGame().GetUIManager().ShowScriptedMenu(new PMZ_MinhaJanela(), null);

// Fechar a tela (dentro da própria classe da janela)
GetGame().GetUIManager().HideScriptedMenu(this);
\`\`\`

## Estrutura da Classe de Tela

\`\`\`c
class PMZ_MinhaJanela extends UIScriptedMenu
{
    override Widget Init()
    {
        layoutRoot = GetGame().GetWorkspace()
            .CreateWidgets("PMZ_MeuMod/GUI/MinhaJanela.layout");

        // Conectar botão fechar
        ButtonWidget btnFechar = ButtonWidget.Cast(
            layoutRoot.FindAnyWidget("BtnFechar"));
        if (btnFechar)
            btnFechar.SetHandler(this);

        return layoutRoot;
    }

    override bool OnClick(Widget w, int x, int y, int button)
    {
        if (w.GetName() == "BtnFechar")
        {
            GetGame().GetUIManager().HideScriptedMenu(this);
            return true;
        }
        return false;
    }
}
\`\`\`

## Onde o arquivo .layout fica
\`PMZ_MeuMod/GUI/MinhaJanela.layout\`

## Avisos
- Sempre verificar se o widget foi encontrado antes de usar (null check)
- SetHandler(this) conecta eventos de clique ao script atual
- O layout é criado via CreateWidgets(), não new Widget()
`,
    });

    this.add({
      category: 'anti_pattern',
      title:    'Criação de Diretórios Aninhados de Uma Vez',
      filename: 'directory_creation_nested',
      tags:     ['MakeDirectory', 'profile', 'crash'],
      versions: ['1.28', '1.29'],
      content: `
## Problema
DayZ NÃO cria diretórios pai automaticamente.
Tentar criar \`PandoraModz/PMZ_Mod/logs\` de uma vez causa falha silenciosa.

## ❌ ERRADO
\`\`\`c
MakeDirectory("$profile:PandoraModz/PMZ_MeuMod/logs"); // FALHA — PandoraModz pode não existir
\`\`\`

## ✅ CORRETO — Criar passo a passo
\`\`\`c
void PMZ_CriarDiretorios()
{
    string pandora = "$profile:PandoraModz";
    if (!FileExist(pandora))
        MakeDirectory(pandora);

    string mod = pandora + "/PMZ_MeuMod";
    if (!FileExist(mod))
        MakeDirectory(mod);

    string logs = mod + "/logs";
    if (!FileExist(logs))
        MakeDirectory(logs);
}
\`\`\`

## Regra
Um MakeDirectory por nível. Sempre verificar com FileExist antes.
`,
    });

    this.add({
      category: 'ui_pattern',
      title:    'Estrutura Básica de arquivo .layout',
      filename: 'layout_file_structure',
      tags:     ['layout', 'GUI', 'widgets', 'xml'],
      versions: ['1.28', '1.29'],
      content: `
## Estrutura XML de um .layout DayZ

\`\`\`xml
<?xml version="1.0" encoding="utf-8"?>
<layer class="ImageWidget" name="Root" x="0" y="0" width="1" height="1"
    red="0" green="0" blue="0" alpha="0.7">

  <!-- Fundo do painel -->
  <layer class="ImageWidget" name="Background"
    left="0.3" top="0.2" right="0.7" bottom="0.8"
    red="0.1" green="0.1" blue="0.1" alpha="0.9">

    <!-- Título -->
    <layer class="TextWidget" name="TxtTitulo"
      left="0.05" top="0.03" right="0.95" bottom="0.12"
      text="PMZ Menu" font="RobotoCondensed_Bold"
      color="0xFFFFD700" align="center" />

    <!-- Botão fechar -->
    <layer class="ButtonWidget" name="BtnFechar"
      left="0.4" top="0.85" right="0.6" bottom="0.95"
      text="Fechar" color="0xFFFFFFFF" />

  </layer>
</layer>
\`\`\`

## Widgets disponíveis
- **ImageWidget** — imagem ou fundo colorido (rgba)
- **TextWidget** — texto estático
- **ButtonWidget** — botão clicável (SetHandler para eventos)
- **EditBoxWidget** — campo de texto editável
- **CheckBoxWidget** — caixa de seleção
- **SliderWidget** — controle deslizante
- **GridSpacerWidget** — espaçador para layout em grade
- **ScrollWidget** — área rolável

## Posicionamento
Valores de 0.0 a 1.0 representam fração da tela (ou do widget pai).
\`left=0.3 right=0.7\` = widget ocupa o centro 40% da largura.

## Acesso pelo script
\`\`\`c
TextWidget txt = TextWidget.Cast(layoutRoot.FindAnyWidget("TxtTitulo"));
if (txt)
    txt.SetText("Novo texto");
\`\`\`
`,
    });

    console.error('[MCP] Knowledge Base populada com receitas iniciais ✅');
  }
}
