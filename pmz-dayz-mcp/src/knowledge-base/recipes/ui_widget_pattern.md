# UI Widget Pattern - Layout e Script correto para DayZ 1.29

**Categoria:** recipe
**Versões:** 1.29
**Tags:** ui, widget, layout, button, font, 5_Mission
**Adicionado em:** 19/04/2026

---
# Padrão correto de UI Widget DayZ 1.29

## Regra
UI SOMENTE em `5_Mission`. Nomes no .layout DEVEM ser idênticos ao `FindAnyWidget`.

## Layout (.layout)
```
ButtonWidgetClass PAT_MeuBtn {
 position 10 10
 size 200 30
 hexactpos 1
 vexactpos 1
 hexactsize 1
 vexactsize 1
 {
  PanelWidgetClass PAT_MeuBtnBg {
   ignorepointer 1
   color 0.15 0.55 0.25 0.85
   size 1 1
   hexactsize 0
   vexactsize 0
   style rover_sim_colorable
  }
  TextWidgetClass {
   ignorepointer 1
   size 1 1
   hexactsize 0
   vexactsize 0
   text "MEU BOTAO"
   font "gui/fonts/sdf_MetronBook72"
   "exact text" 1
   "exact text size" 11
   "text halign" center
   "text valign" center
  }
 }
}
```

## Script (.c em 5_Mission)
```c
ButtonWidget m_Btn = ButtonWidget.Cast(root.FindAnyWidget("PAT_MeuBtn"));
// SEMPRE validar NULL
if (!m_Btn) return;
```

## Regras de sizing
- `hexactsize 1, vexactsize 1` → pixels exatos
- `hexactsize 0, vexactsize 0` → fração (0.0 a 1.0)
- Filhos de botão: usar fração (1 1) para preencher o pai
- Pai: usar pixel exato para posicionamento preciso

## Fontes
- Sempre `gui/fonts/sdf_MetronBook72`
- Com `"exact text" 1` e `"exact text size" N` (8-14 range típico)
- SEM exact text → fonte fica gigante e estoura a caixa