---
id: kb-ui-layout
title: UI e layouts (.layout 1.29, ScriptedWidget, ItemPreview)
subsystem: ui
tags: [layout, FrameWidgetClass, ScriptedWidgetEventHandler, TextWidget, ItemPreviewWidget]
game_version: 1.29
last_verified: 2026-07-03
---

# UI e layouts

A UI do DayZ é montada por arquivos `.layout` (hierarquia de widgets) carregados por
`UIScriptedMenu`/`ScriptedWidgetEventHandler`, com `.styles` para aparência.

## Formato nativo de .layout em 1.29 (crítico)

Em 1.29 o formato antigo baseado em `<Widget type="...">` (XML de gerações
anteriores) **crasha** ao carregar. Use o formato nativo Enfusion com blocos de
classe de widget:

```
FrameWidgetClass Root
{
    x 0; y 0; w 1; h 1;
    TextWidgetClass Titulo
    {
        x 0.1; y 0.05; w 0.8; h 0.06;
        "text" "Loja PMZ";
        "font" "GUI/fonts/...";
    };
    ButtonWidgetClass BtnComprar { ... };
};
```

Reaproveite um layout que já funcione em 1.29 (padrão do PMZ_Missions) como
esqueleto em vez de portar XML velho.

## Carregando e tratando eventos

```c
class PMZ_LojaMenu extends UIScriptedMenu
{
    override Widget Init()
    {
        layoutRoot = GetGame().GetWorkspace().CreateWidgets("PMZ_Mod/gui/loja.layout");
        m_Titulo = TextWidget.Cast(layoutRoot.FindAnyWidget("Titulo"));
        return layoutRoot;
    }

    override bool OnClick(Widget w, int x, int y, int button) { /* ... */ return false; }
}
```

`ScriptedWidgetEventHandler` recebe `OnClick`, `OnMouseEnter`, etc. Sempre `.Cast` o
widget encontrado por `FindAnyWidget`.

## TextWidget só tem SetText (não GetText)

`TextWidget` expõe `SetText` mas **não** um `GetText` confiável — ler o texto de
volta derruba o módulo em 1.29. Se precisa saber o que está escrito num card,
**guarde o valor num map paralelo** indexado pelo índice do card/widget e leia de lá.

## ItemPreviewWidget

Renderiza um modelo 3D de item na UI (ícone de loja/inventário). Você atribui a
entidade a previsualizar e ajusta orientação/escala. É o caminho para mostrar o item
real (não uma imagem estática). Cuidado com o overbright de imagem (ver kb-rvmat) em
ícones renderizados.

## Virtualização / pooling

Listas grandes (loja, leaderboard) não devem criar um widget por item. Faça
**pooling**: mantenha N widgets visíveis e re-preencha o conteúdo conforme o scroll,
mapeando índice de dado → widget reciclado. Cria/destruir widget por linha causa
hitch e vazamento.

## Resposta RPC pode chegar ANTES do menu registrar

O servidor pode responder com os dados antes de o `UIScriptedMenu` existir/registrar.
Nunca descarte a resposta: **cacheie no singleton do cliente** e, no `Init()` do
menu, puxe o valor cacheado. Senão a UI abre vazia intermitentemente ("bem
aleatório").
