---
doc_id: kb-api-changes-130
title: "API Changes & Migration Guide — DayZ 1.29 → 1.30"
subsystem: Core / Migration
category: reference
tags: ["api-changes", "migration", "breaking-changes", "1.30", "diff"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# API Changes & Migration Guide (1.29 → 1.30)

## Resumo de Breaking Changes

| Área | Mudança | Impacto | Ação Necessária |
|---|---|---|---|
| Base Building | `ConstructionBase` refatorado → hierarquia `ConstructionBasic → ConstructionBase → Rebuilding` | 🔴 Alto | Reescrever mods de construção |
| Vehicle Components | Luzes/VFX/Horn extraídos para componentes dedicados | 🟡 Médio | Migrar acesso direto para componentes |
| Sandstorm | Novo sistema server-only | 🟢 Baixo | Apenas leitura client-side via `Weather::GetSandstorm()` |
| CodeLock | Novo componente de segurança | 🟢 Baixo | Opcional integrar |
| Symptoms | Novos modifiers + `RPC_SYMPTOM_PARAM_SYNC` | 🟡 Médio | Considerar em diagnósticos/tratamentos |
| MissionBenchmark | Removido | 🟢 Baixo | Remover referências |

## APIs Centrais Modificadas

### 1_Core (Proto Natives)
Arquivos com mudanças em proto natives que podem afetar qualquer mod:
- `constants.c` — Novas constantes globais
- `proto/EnScript.c` — Proto natives novos/alterados
- `proto/EnWorld.c` — World API expandida
- `proto/EnMath3D.c` — Math3D extensions
- `proto/EnConvert.c` — Conversion utilities

### 3_Game (Core Systems)
- `DayZGame.c`, `Global/Game.c`, `Global/World.c` — Core game loop modifications
- `Entities/EntityAI.c`, `Man.c`, `Entity.c`, `Object.c` — Base entity changes
- `Systems/Inventory/*` (6 arquivos) — Inventory system extended
- `DamageSystem.c` — Damage zones updates
- `CE/CentralEconomy.c` — CE changes
- `Enums/ERPCs.c` — **+15 novos RPCs** (ver lista abaixo)
- `Enums/EActions.c` — Novas ações adicionadas

### 4_World (Gameplay)
- `Classes/PlayerModifiers/*` — Novos modifiers (SandstormExposure, HeatStroke, Silicosis, IrritatedEyes)
- `Classes/Cooking/*`, `FoodStage/*` — Cooking system updates
- `Classes/ContaminatedArea/*` — OilPitArea adicionado
- `Entities/Vehicles/*` — Component refactoring

## Novos RPCs (15)

### Produção (7)
| RPC | Uso |
|---|---|
| `RPC_BUNKERBROADCAST_CONFIG_SYNC` | Sync config de broadcast |
| `RPC_CODE_LOCK_REQUEST` | Interação com codelock |
| `RPC_CODE_LOCK_RESPONSE` | Resposta do servidor |
| `RPC_CODE_LOCK_UI_ACTION` | Ação de UI |
| `RPC_ITEM_SOUND_PLAY` | Tocar som em item |
| `RPC_ITEM_SOUND_STOP` | Parar som em item |
| `RPC_SYMPTOM_PARAM_SYNC` | Sync parâmetros de sintomas |

### Dev/Diag (8)
| RPC | Uso |
|---|---|
| `DEV_SET_SANDSTORM` | Forçar sandstorm |
| `DEV_SET_SANDSTORM_WEATHER` | Via weather system |
| `DEV_STOP_SANDSTORM` | Parar sandstorm |
| `DEV_STOP_SANDSTORM_WEATHER` | Via weather system |
| `DIAG_BASEBUILDING_FASTBUILD` | Fast build debug |
| `DIAG_MISC_RADIOGAMEPLAY_BUNKERS_LIST` | Lista bunkers |
| `DIAG_MISC_RADIOGAMEPLAY_DEBUG_DATA` | Debug data |
| `DIAG_RADIO_GAMEPLAY_LOGGING` | Logging |

## Novos Enums (21)

### Veículos
- `MotorbikeSoundCtrl`, `MotorbikeFluid` — Motorbike
- `EVehicleVFXEffect`, `EVehicleVFXEffectGroup` — VFX veicular
- `MotorbikeHeadlightState`, `MotorbikeRearLightType`, `EMotorbikeOperationalState`, `EMotorbikeDebugMode`, `MotorbikeEngineSoundState` — MotorbikeScript

### Construção
- `EConstructionInfoCategories`, `EConstructionTools` — Constants
- `ConstructionMaterialType`, `EConstructionDirCheckType`, `EConstructionDebugModes` — ConstructionBase
- `eConstructionIconItemState` — UI icons

### CodeLock
- `CodeLockStage`, `CodeLockUIAction`, `CodeLockLightState`

### Outros
- `EDiagMenuGame` — Diag menu
- `ELiquidSourceObjectType` — Liquid sources
- `EOilPitState` — Oil pit

## Arquivos Removidos
- `5_Mission/mission/MissionBenchmark.c` — Benchmark removido

## Checklist de Migração para Mods

### Antes de Migrar
- [ ] Ler `DIFF_1.29_para_1.30.md` completo
- [ ] Identificar quais sistemas seu mod usa
- [ ] Testar em ambiente experimental antes de publicar

### Durante a Migração
- [ ] **Base Building:** Migrar para nova hierarquia Construction/Rebuilding
- [ ] **Veículos:** Verificar uso de luzes/VFX/buzina → migrar para componentes
- [ ] **RPCs:** Verificar conflitos com 15 novos RPCs vanilla
- [ ] **Saúde:** Considerar novos sintomas em lógica de diagnóstico
- [ ] **References:** Remover dependência de `MissionBenchmark` se presente

### Após Migrar
- [ ] Testar em servidor experimental 1.30
- [ ] Validar persistência de dados (storage version mudou em Rebuilding)
- [ ] Verificar compatibilidade client-side com replicação server-side
- [ ] Atualizar documentação do mod

## Recursos Adicionais
- `DIFF_1.29_para_1.30.md` — Changelog completo com todos os arquivos novos/removidos/modificados
- `kb-sandstorm` — Documentação do sistema Sandstorm
- `kb-construction-rebuilding` — Documentação do sistema Construction/Rebuilding
- `kb-motorbike` — Documentação da Motorbike
- `kb-codelock` — Documentação do CodeLock
- `kb-symptoms-130` — Documentação dos novos sintomas

## Ferramentas MCP para Migração
Use as tools do MCP para validar sua migração:
- `dayz_api_diff{from:"1.29", to:"1.30"}` — Diff estruturado de APIs
- `dayz_get_class{name:"X", version:"1.30"}` — Verificar assinatura atualizada
- `dayz_kb_search{query:"construction", version:"1.30"}` — Consultar docs curados
- `dayz_get_source{file:"...", version:"1.30"}` — Inspecionar código fonte atualizado