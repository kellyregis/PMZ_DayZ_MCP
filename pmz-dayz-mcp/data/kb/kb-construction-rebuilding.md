---
doc_id: kb-construction-rebuilding
title: "Construction & Rebuilding — Sistema de Base Building Refatorado (1.30)"
subsystem: Base Building / Construction
category: new-system
tags: ["construction", "rebuilding", "base-building", "persistence", "1.30"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# Construction & Rebuilding (DayZ 1.30)

## Visão Geral
O sistema de construção foi **completamente refatorado** na 1.30. A antiga API de base building foi substituída por uma hierarquia tipada com suporte a persistência versionada, decay configurável e parts especializadas. Mods de construção da 1.29 **NÃO SÃO COMPATÍVEIS** sem migração.

## Hierarquia de Classes

```
ConstructionBasic          (3_Game/Systems/Construction_Basic.c)
    └── ConstructionBase   (4_World/Classes/ConstructionBase.c)
            └── Rebuilding (4_World/Classes/Rebuilding/Rebuilding.c)
```

### ConstructionBasic (Module 3)
Classe declarativa para uso no módulo 3. Fornece a interface básica:
- `Init()`, `EEInitConstruction()`
- `OnConstructionVariablesSynchronized()`
- `OnHealthLevelChanged(oldLevel, newLevel, zone)`
- `CanDisplayAttachmentCategoryConstruction(categoryName)` → bool
- `CanUseHandConstruction()` → bool (default false; override em subclasses)
- `HandleStorageEvents()` → bool (protected)
- `HandleStoreSave(ctx)` / `HandleStoreLoad(ctx, version)` — Persistência
- `ProcessConstructionDecay(dTime)` — Decay tick
- `CanConstructionDecay()` → static bool (respeita `CfgGameplayHandler.GetDisableBaseDecay()`)
- `OnConstructionDoorOpenStart(params)` / `OnConstructionDoorCloseStart(params)`

### ConstructionBase (Module 4)
Base class concreta para entidades de construção no mundo. Adiciona:
- Enums: `ConstructionMaterialType`, `EConstructionDirCheckType`, `EConstructionDebugModes`
- Gerenciamento de materials (`ConstructionMaterialData`)
- Verificação de direção e colisão
- Debug modes integrados

### Rebuilding (Module 4)
Sistema completo de rebuilding com parts tipadas. Herda de `ConstructionBase`.

## Parts Tipadas
Cada parte da construção tem um tipo específico:

| Classe | Descrição |
|---|---|
| `ConstructionPartTyped` | Parte genérica tipada |
| `ConstructionPartTypedHolder` | Holder de partes |
| `ConstructionPartRebuildTyped` | Parte rebuildable padrão |
| `ConstructionPartRebuildInvertedTyped` | Parte invertida |
| `ConstructionPartRebuildReversibleBaseTyped` | Base reversível |
| `ConstructionPartRebuildReversibleBarricadeTyped` | Barricada reversível |
| `ConstructionPartRebuildReversibleDoorTyped` | Porta reversível |
| `ConstructionPartRebuildRubbleTyped` | Entulho/rubble |

## Persistência
```cpp
// Versionamento de storage
static int REBUILDING_STORAGE_VERSION = 1;

// Salvamento
override void HandleStoreSave(ParamsWriteContext ctx)
{
    super.HandleStoreSave(ctx);
    // Serializa sync parts (m_SyncParts1..10)
}

// Carregamento
override void HandleStoreLoad(ParamsReadContext ctx, int version)
{
    super.HandleStoreLoad(ctx, version);
    if (version < REBUILDING_STORAGE_VERSION) { /* migration */ }
}
```

## Sincronização de Parts
Rebuilding usa 10 slots de sincronização (`m_SyncParts1` a `m_SyncParts10`) + variantes locais (`m_SyncParts1Local` a `m_SyncParts10Local`). Isso permite replicação eficiente do estado de construção sem enviar dados completos.

## Actions de Construção

| Action | Tipo | Descrição |
|---|---|---|
| `ActionBuildPartInstant` | Instant | Construir parte instantaneamente |
| `ActionDismantlePartInstant` | Instant | Desmontar parte |
| `ActionDestroyPartInstant` | Instant | Destruir parte |
| `ActionPickUpBricks` | Continuous | Pegar tijolos |
| `ActionRepairMotorbikeChassis` | Continuous | Reparar chassis (blowtorch opcional) |
| `ActionRepairMotorbikeEngine` | Continuous | Reparar motor |
| `ActionRepairMotorbikePart` | Continuous | Reparar parte genérica |

## Buildings Rebuildable (Novos na 1.30)
- `House_1M1` a `House_1M5` (5 modelos médios)
- `House_1S1`, `House_1S2` (2 modelos pequenos)
- `House_2M1`, `House_2M2` (2 modelos médios tipo 2)
- `House_2S1` (1 modelo pequeno tipo 2)
- `House_3S1`, `House_3S2` (2 modelos pequenos tipo 3)
- `IrrigationTunnel_Entrance` (entrada de túnel de irrigação)

## Decay Configurável
```cpp
// Verificar se decay está habilitado
if (ConstructionBasic.CanConstructionDecay())
{
    // Processar decay
    construction.ProcessConstructionDecay(deltaTime);
}

// Configuração via CfgGameplayHandler
bool disabled = CfgGameplayHandler.GetDisableBaseDecay();
```

## ⚠️ Notas de Migração (1.29 → 1.30)

1. **API incompatível:** Classes antigas de construção foram substituídas. Mods devem reescrever contra `ConstructionBasic`/`ConstructionBase`/`Rebuilding`.
2. **Parts são tipadas:** Não há mais parts genéricas. Cada parte tem um tipo específico (`ConstructionPartTyped` e variantes).
3. **Persistência versionada:** Storage agora tem versão (`REBUILDING_STORAGE_VERSION`). Mods que salvam dados de construção devem implementar migração.
4. **Sync parts limitados:** Máximo de 10 slots de sync. Mods que adicionam muitas partes customizadas devem planejar cuidadosamente.
5. **Decay é global:** Controlado por `CfgGameplayHandler.GetDisableBaseDecay()`, não por instância.

## Arquivos-Chave
- `3_Game/Systems/Construction_Basic.c` — Interface base (module 3)
- `3_Game/Systems/ConstructionTypeData_Basic.c` — Dados de tipo
- `4_World/Classes/ConstructionBase.c` — Base class concreta
- `4_World/Classes/Rebuilding/Rebuilding.c` — Sistema completo
- `4_World/Classes/BaseBuilding/ConstructionConstants.c` — Constantes e enums
- `4_World/Classes/BaseBuilding/ConstructionMaterials.c` — Materiais
- `4_World/Classes/BaseBuilding/ConstructionInitData.c` — Dados de inicialização
- `4_World/Classes/BaseBuilding/TypeConstructionData/*.c` — Parts tipadas
- `4_World/Entities/Building/Rebuildable/*.c` — Buildings rebuildable