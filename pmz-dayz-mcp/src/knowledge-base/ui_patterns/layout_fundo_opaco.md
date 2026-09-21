# Fundo opaco e legível em widgets DayZ (toast, painel, modal)

**Categoria:** ui_pattern
**Versões:** 1.28, 1.29
**Tags:** layout, color, background, panel, toast, notification, widget, opacity, alpha
**Adicionado em:** 02/05/2026

---
# Fundo opaco em layouts DayZ

## Problema

Widgets com fundo "transparente" mesmo com alpha alto, ou fundos que aparecem brancos sólidos quando deveriam ser dark.

## Causas raiz

1. **Formato de cor errado** — DayZ usa `color R G B A` (sem aspas) com floats normalizados `0..1`. Valores `>1` são clampados pra 1, gerando branco saturado.

   ❌ Errado: `"color" 12 14 20 204` (interpretado como 0..1, todos viram 1 = branco opaco)
   ✅ Certo: `color 0.05 0.06 0.09 0.96`

   Nota: `"color" R G B A` com aspas em alguns widgets antigos ainda funciona com 0..255, mas é inconsistente. **Sempre prefira o formato unquoted normalizado** — bate com o que o vanilla DayZ usa em todos os layouts internos (`gui/layouts/day_z_*.layout`).

2. **`GridSpacer` / `WrapSpacer` precisam de `style Colorable`** — sem isso, esses tipos de widget são containers invisíveis, ignoram o atributo `color`. Apenas `PanelWidget` e `ImageWidget` renderizam color por padrão.

3. **`inheritalpha 1` (default) propaga alpha do pai pros filhos** — se algum ancestral tem alpha < 1, os filhos ficam parcialmente transparentes mesmo com cor 100% opaca. Em widgets de fundo crítico, setar `inheritalpha 0`.

## Receita pra fundo dark/legível (toast notification, modal, painel)

```
GridSpacerWidgetClass MyRoot {
 ignorepointer 1
 inheritalpha 0                       // independe do alpha do pai
 clipchildren 0
 color 0.05 0.06 0.09 0.96            // dark, 96% opaco
 size 380 0
 hexactsize 1
 vexactsize 1
 style Colorable                      // OBRIGATORIO em GridSpacer/WrapSpacer pra cor renderizar
 "Size To Content V" 1                // altura adapta ao conteudo (ideal pra toast multi-linha)
 Rows 1 Columns 2
 {
   WrapSpacerWidgetClass Accent {
     inheritalpha 0
     color 1.0 0.86 0.20 1.0
     size 4 1
     hexactsize 1 vexactsize 0
     style Colorable
     "Size To Content V" 1
   }
   GridSpacerWidgetClass Content {
     inheritalpha 0
     ...
   }
 }
}
```

## Texto multi-linha sem cortar

`RichTextWidget` com `wrap 1` + `"size to text v" 1` dentro de container `GridSpacer` com `"Size To Content V" 1` — o widget cresce conforme o texto, e o root cresce junto.

```
RichTextWidgetClass Body {
 size 1 1
 hexactsize 0 vexactsize 0
 font "gui/fonts/sdf_MetronBook18"
 "exact text" 1
 "exact text size" 18
 "size to text v" 1                   // CHAVE: cresce vertical com texto
 wrap 1                               // quebra linha automatica
 color 0.88 0.90 0.94 1.0
}
```

`MultilineTextWidget` clipa em altura fixa e NÃO redimensiona — só usar com altura grande pré-definida.

## Cor dinâmica via script

Para colorir partes do widget (accent, icon tint) em runtime, usar `SetColor(ARGB(a, r, g, b))` onde valores são 0..255 ints (DayZ converte internamente). Funciona independente do formato do layout estático.

```c
int accent = ARGB(255, 255, 96, 110);
m_Accent.SetColor(accent);
m_Icon.SetColor(accent);              // tinge icones do imageset dayz_gui (monocromaticos)
```

## Anti-patterns

- ❌ `"color" 12 14 20 204` — formato 0-255 com aspas: inconsistente, alguns widgets clampam pra branco
- ❌ `GridSpacer` com `color` mas sem `style Colorable` — invisível
- ❌ Body fixo em `MultilineTextWidget size 270 88` esperando texto longo — clipa
- ❌ FrameWidget root com `Size To Content V` — não cresce, só GridSpacer/WrapSpacer crescem

## Referência

- Vanilla DayZ layouts (`gui/layouts/day_z_*.layout`) confirmam formato `color 0.X 0.X 0.X 0.X`.
- Banking mod (`PMZ_Banking/GUI/layouts/BankingMenu.layout`) usa `color 0.12 0.12 0.14 0.98` em painéis solid escuros — padrão visual de referência.
- Mod de notificações de exemplo usa `style Colorable` + `inheritalpha 0` + `Size To Content V` pra adaptar altura.
