# Enforce Script nao suporta operador ternario

**Categoria:** anti_pattern
**Versões:** 1.29
**Tags:** ternary, operator, compile, enforce_script, quirk
**Adicionado em:** 20/04/2026

---
# Operador ternário `? :` NÃO existe em Enforce Script

## Erro
```
Broken expression (missing ';'?)
```

## Anti-pattern
```c
// ❌ ERRADO
int color = (active) ? ARGB(255,230,130,30) : ARGB(255,50,50,50);
widget.SetColor(flag ? colorA : colorB);
```

## Solução
```c
// ✅ CORRETO — usar if/else ou método helper
if (active)
    widget.SetColor(ARGB(255, 230, 130, 30));
else
    widget.SetColor(ARGB(255, 50, 50, 50));
```