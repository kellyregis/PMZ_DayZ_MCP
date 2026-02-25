# Abrir Tela / Menu Customizado

**Categoria:** recipe
**Versões:** 1.28, 1.29
**Tags:** UI, screen, menu, UIScriptedMenu
**Adicionado em:** 25/02/2026

---

## Código Base — Abrir e Fechar

```c
// Abrir a tela
GetGame().GetUIManager().ShowScriptedMenu(new PMZ_MinhaJanela(), null);

// Fechar a tela (dentro da própria classe da janela)
GetGame().GetUIManager().HideScriptedMenu(this);
```

## Estrutura da Classe de Tela

```c
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
```

## Onde o arquivo .layout fica
`PMZ_MeuMod/GUI/MinhaJanela.layout`

## Avisos
- Sempre verificar se o widget foi encontrado antes de usar (null check)
- SetHandler(this) conecta eventos de clique ao script atual
- O layout é criado via CreateWidgets(), não new Widget()
