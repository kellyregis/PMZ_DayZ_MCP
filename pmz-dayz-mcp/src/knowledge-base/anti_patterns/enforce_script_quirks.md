# Enforce Script Quirks - Erros silenciosos de compilacao

**Categoria:** anti_pattern
**Versões:** 1.29
**Tags:** quirks, compile, parser, enforce_script, anti_pattern, workbench
**Adicionado em:** 19/04/2026

---
# Quirks do Enforce Script DayZ 1.29

Erros que o compilador não explica bem ou que parecem corretos mas falham.

## 1. || multi-linha quebra o parser
```c
// ❌ ERRADO
if (a == "X" || a == "Y"
    || a == "Z")  // "Invalid statement ')'"

// ✅ CORRETO — variáveis intermediárias ou array
bool match = (a == "X");
if (!match) match = (a == "Y");
if (!match) match = (a == "Z");
```

## 2. int + string não concatena
```c
// ❌ ERRADO
label.SetText(count + " itens");  // "Incompatible parameter"

// ✅ CORRETO
label.SetText(count.ToString() + " itens");
```

## 3. GetPos/SetPos usam float
```c
// ❌ ERRADO
int wx, wy;
widget.GetPos(wx, wy);  // "Cannot convert int to float"

// ✅ CORRETO
float wx, wy;
widget.GetPos(wx, wy);
```

## 4. EEOnDamageCalculated — 8 params na 1.29
```c
// ❌ ERRADO (7 params, faltou speedCoef)
override bool EEOnDamageCalculated(..., vector modelPos)

// ✅ CORRETO
override bool EEOnDamageCalculated(..., vector modelPos, float speedCoef)
```

## 5. Close() reservado em UIScriptedMenu
```c
// ❌ "Multiple declaration of function Close"
void Close() { ... }

// ✅ Renomear
void CloseUI() { ... }
```

## 6. XComboBoxWidget sem GetItem()
Manter array paralelo de nomes para mapear índice → texto.

## 7. GetObjectsAtPosition3D — 4º param obrigatório
```c
// ❌ null causa crash
GetGame().GetObjectsAtPosition3D(pos, r, objs, null);

// ✅ Array real
array<CargoBase> cargos = new array<CargoBase>();
GetGame().GetObjectsAtPosition3D(pos, r, objs, cargos);
```

## 8. CLASSES — sempre modded, nunca herdar vanilla
```c
// ❌ PROIBIDO
class MeuGame : DayZGame

// ✅ CORRETO
modded class DayZGame { ... }
```