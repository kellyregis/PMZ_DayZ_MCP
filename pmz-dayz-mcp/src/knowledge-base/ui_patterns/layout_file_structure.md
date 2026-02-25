# Estrutura Básica de arquivo .layout

**Categoria:** ui_pattern
**Versões:** 1.28, 1.29
**Tags:** layout, GUI, widgets, xml
**Adicionado em:** 25/02/2026

---

## Estrutura XML de um .layout DayZ

```xml
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
```

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
`left=0.3 right=0.7` = widget ocupa o centro 40% da largura.

## Acesso pelo script
```c
TextWidget txt = TextWidget.Cast(layoutRoot.FindAnyWidget("TxtTitulo"));
if (txt)
    txt.SetText("Novo texto");
```
