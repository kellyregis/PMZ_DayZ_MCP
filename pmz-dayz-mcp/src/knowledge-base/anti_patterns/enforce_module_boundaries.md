# Regras de Modulos - Nunca referenciar tipo de modulo superior

**Categoria:** anti_pattern
**Versões:** 1.29
**Tags:** modules, 3_Game, 4_World, 5_Mission, PlayerIdentity, compile, unknown_type
**Adicionado em:** 19/04/2026

---
# Fronteiras de Módulos DayZ 1.29

## Regra
NUNCA referenciar um tipo definido em módulo superior dentro de módulo inferior.

## Módulos e seus tipos disponíveis
- **3_Game**: lógica base. **NÃO TEM**: `PlayerIdentity`, `PlayerBase`, `DayZGame`, `CarScript`, `EntityAI`, `Transport`
- **4_World**: entidades. **TEM**: `PlayerIdentity`, `PlayerBase`, `CarScript`, `Transport`, `EntityAI`
- **5_Mission**: UI/HUD. **TEM**: `DayZGame`, `MissionGameplay`, `MissionServer`, todos os tipos de 4_World

## Anti-pattern (causa "Unknown type")
```c
// ❌ ERRADO — 3_Game referenciando PlayerIdentity
// Scripts/3_Game/MeuCore.c
bool DispatchRPC(PlayerIdentity sender, ...) // COMPILE ERROR!
```

## Solução correta
```c
// ✅ CORRETO — usar Class genérico em 3_Game
// Scripts/3_Game/MeuCore.c
bool DispatchRPC(Class sender, ...)

// Scripts/4_World/MeuModulo.c — cast aqui
override bool OnRPC(Class sender, ...)
{
    PlayerIdentity id = PlayerIdentity.Cast(sender);
    if (!id) return true;
}
```

## Nota
`modded class DayZGame` em 3_Game precisa de `#ifndef WORKBENCH` wrapper para evitar erro no Workbench.