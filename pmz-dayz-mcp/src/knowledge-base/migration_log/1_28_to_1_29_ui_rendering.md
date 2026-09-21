# Migracao 1.28 → 1.29: UI desbotada / lavada

**Categoria:** migration_log
**Versoes:** 1.28 → 1.29
**Tags:** GUI, layout, src alpha, rendering, ImageWidget, washed-out, desbotada
**Status:** RESOLVIDO
**Adicionado em:** 28/04/2026

---

## Sintoma

Apos atualizar o servidor/cliente DayZ de 1.28 para 1.29, todas as UIs custom (PMZ_Loja, PMZ_Missions) apareceram com cores **lavadas / desbotadas / opacas**. O background EDDS rendava como uma versao mais clara/dessaturada da textura PNG fonte. O efeito era mais visivel em telas com background grande (telas inteiras como Leaderboard, ShopPanel, Mission Invite).

## Causa raiz

Bohemia mudou o comportamento da propriedade `"src alpha"` em `ImageWidget` no engine 1.29:

- **1.28**: `"src alpha" 1` em `ImageWidgetClass` com `imageTexture` era essencialmente no-op (textura renderizava com seu RGB original).
- **1.29**: `"src alpha" 1` faz a textura ser **alpha-blendeada com o widget pai por tras**. Como o `PanelWidgetClass` que envolve o `ImageWidget` quase sempre tem cor escura (ex: `0.06 0.05 0.04` marrom-preto), a textura se mistura com essa cor, dessaturando.

## Fix (Loja, replicado no Missions)

**Para `ImageWidgetClass` que sao backgrounds principais de painel (cobrem area grande), REMOVER a linha `"src alpha" 1`.**

### Antes (1.28, washed em 1.29)
```
ImageWidgetClass MainPanelBg {
 ignorepointer 1
 color 1 1 1 1
 position 0 0
 size 1 1
 imageTexture "PMZ_Mod/data/background.edds"
 mode blend
 "src alpha" 1                    <-- REMOVER essa linha
 "stretch mode" stretch_w_h
 filter 1
}
```

### Depois (1.29 OK)
```
ImageWidgetClass MainPanelBg {
 ignorepointer 1
 color 1 1 1 1
 position 0 0
 size 1 1
 imageTexture "PMZ_Mod/data/background.edds"
 mode blend
 "stretch mode" stretch_w_h
 filter 1
}
```

## Atencao - quando MANTER `"src alpha" 1`

Em **icones pequenos** (ex: `MenuTab.edds`, `BasketGrunge.edds`, `GemGrunge.edds`) que tem alpha real (PNG transparente pra forma de icone), **MANTER** o `"src alpha" 1`. Sem ele, o icone fica como retangulo solido em vez de uma forma com transparencia.

Regra: 
- Background grande (textura cobrindo painel inteiro) → REMOVER
- Icone pequeno com alpha → MANTER

## Verificacao

Antes de mexer, lista todas as ocorrencias:
```bash
grep -rn "src alpha" PMZ_Meu_Mod/scripts/5_Mission/GUI/
```

Pra cada match, identifica se e background ou icone (olhando o nome da classe `ImageWidgetClass XXX` e a textura referenciada).

## Bonus: alpha de painel tambem mudou

Alem do `"src alpha"`, em geral **alphas baixos (0.4-0.85)** em `PanelWidgetClass` ficaram mais transparentes em 1.29. Bumps recomendados:

| Alpha 1.28 | Alpha 1.29 |
|---|---|
| 0.4 | 0.7 |
| 0.5 | 0.8 |
| 0.6 / 0.65 | 0.85 |
| 0.7 / 0.75 | 0.9 |
| 0.8 / 0.85 / 0.9 | 0.95 |
| 0.92 | 0.98 |

## Anti-pattern relacionado

Quando a textura EDDS **ja tem o desenho da UI inteira** (ex: linhas do leaderboard, slots de premio, bordas decorativas), NAO criar `PanelWidgetClass` por cima com cor solida — isso esconde o desenho da textura. Use `color 0 0 0 0` (transparente) nesses paineis pra que so o texto e botoes overlay sejam visiveis sobre a textura.

Exemplo: PMZ_Missions Leaderboard usa textura `1920x1080_tela_reward.edds` que tem 10 linhas de tabela + REWARD SUMMARY ja desenhados. Os widgets `LBRow0..LBRow9` e `LBColumnHeader` devem ficar transparentes.

## Referencias no repo

- Fix da Loja: ver `D:\Mods\PMZ_Loja_projeto\backup\Backup_antes_Troca_skin\PMZ_Loja\GUI\PMZShopPanel.layout` (versao 1.28) vs `D:\Mods\PMZ_Loja_projeto\PMZ_Loja\GUI\PMZShopPanel.layout` (versao 1.29 fixed). Diff mostra a remocao do `"src alpha" 1` na linha 43.
- Fix do Missions: aplicado em `PMZ_Leaderboard.layout` (linha 43) e `PMZ_MissionInvite.layout` (linha 45) na sessao de 28/04/2026.
