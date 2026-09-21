---
doc_id: kb-symptoms-130
title: "Novos Sintomas e Doenças — Silicosis, HeatStroke, IrritatedEyes (1.30)"
subsystem: Player Health / Symptoms
category: new-system
tags: ["symptoms", "diseases", "modifiers", "health", "1.30"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# Novos Sintomas e Doenças (DayZ 1.30)

## Visão Geral
A versão 1.30 introduz novos modifiers de saúde, transmission agents e estados de sintomas, integrados ao sistema existente de PlayerModifiers. Um novo RPC (`RPC_SYMPTOM_PARAM_SYNC`) permite sincronização eficiente de parâmetros de sintomas entre servidor e cliente.

## Novos Modifiers

### Silicosis
- **Classe Modifier:** `SilicosisMdfr` (em `4_World/Classes/PlayerModifiers/Modifiers/diseases/Silicosis.c`)
- **Transmission Agent:** `SilicosisAgent` (`4_World/Classes/TransmissionAgents/Agents/SilicosisAgent.c`)
- **Enum Agent:** `SILICOSIS` (em `eAgents`)
- **Causa:** Exposição prolongada a poeira/partículas (associado à Sandstorm e ambientes subterrâneos)
- **Efeitos:** Dano respiratório progressivo, tosse, redução de stamina
- **Sync:** Via `RPC_SYMPTOM_PARAM_SYNC`

### HeatStroke (Insolação)
- **Classe Modifier:** `HeatStrokeMdfr` (em `4_World/Classes/PlayerModifiers/Modifiers/diseases/HeatStroke.c`)
- **Fases:** `HeatStrokePhase1Mdfr`, `HeatStrokePhase2Mdfr`, `HeatStrokePhase3Mdfr`, `HeatStrokePhase4Mdfr`
- **Enums:** `MDF_HEAT_STROKE1` a `MDF_HEAT_STROKE4` (em `eModifiers`), `MODIFIER_SYNC_HEAT_STROKE` (em `eModifierSyncIDs`)
- **Causa:** Exposição prolongada a calor extremo + desidratação
- **Efeitos:** Desorientação, dano de saúde, possível desmaio (`FaintState`)
- **Integração:** Conecta-se ao sistema de temperatura universal (`UniversalTemperatureSource`)

### IrritatedEyes (Olhos Irritados)
- **Modifier:** `4_World/Classes/PlayerModifiers/Modifiers/diseases/IrritatedEyes.c`
- **Symptom State:** `4_World/Classes/PlayerSymptoms/States/Secondary/IrritatedEyes.c`
- **Transmission Agent:** `EyesIrritation` (`4_World/Classes/TransmissionAgents/Agents/EyesIrritation.c`)
- **Causa:** Exposição à sandstorm, poeira, fumaça
- **Efeitos Visuais:** Overlay de veias (`GEWidgetsMetaDataEyeVeins`), squint (`SquintState`)
- **PPE:** `PPERequester_SquintEffects`

## Novos Estados Secundários de Sintomas

| Estado | Arquivo | Descrição |
|---|---|---|
| `FaintState` | `4_World/Classes/PlayerSymptoms/States/Secondary/FaintState.c` | Desmaio por insolação ou exaustão |
| `IrritatedEyes` | `4_World/Classes/PlayerSymptoms/States/Secondary/IrritatedEyes.c` | Olhos irritados (visual + gameplay) |
| `SquintState` | `4_World/Classes/PlayerSymptoms/States/Secondary/SquintState.c` | Olhos semicerrados (reduz visibilidade) |

## Gameplay Effect Widgets (Overlays Visuais)
- `GEWidgetsMetaDataEyeVeins` — Veias nos olhos (irritação)
- `GEWidgetsMetaDataSquinting` — Efeito de squint
- Layouts: `gameplay/EyeSquintEffects.layout`, `gameplay/EyeVeinsEffects.layout`

## RPC de Sincronização
- **`RPC_SYMPTOM_PARAM_SYNC`** — Sincroniza parâmetros de sintomas do servidor para o cliente
- Usado para transmitir estado de modifiers sem replicar a entidade inteira
- Mods que adicionam sintomas customizados devem usar este RPC para consistência

## Integração com Sandstorm
Os novos sintomas estão diretamente ligados ao sistema de Sandstorm:
- `SandstormExposure` modifier rastreia tempo de exposição
- Exposição alta → `IrritatedEyes` → `Silicosis` (progressivo)
- PPE requester aplica overlays visuais automaticamente

## ⚠️ Notas para Modders

1. **Use o sistema de PlayerModifiers:** Novos sintomas seguem o padrão existente. Crie subclasses de `ModifierBase` e registre no `PlayerModifiersManager`.
2. **Transmission Agents:** Para sintomas contagiosos ou ambientais, crie um `TransmissionAgent` correspondente.
3. **RPC_SYMPTOM_PARAM_SYNC:** Use este RPC para sincronizar parâmetros customizados em vez de criar canais próprios.
4. **Widgets de efeito:** Overlays visuais usam o sistema de GameplayEffectWidgets. Registre novos widgets no metadata correspondente.
5. **Compatibilidade:** Mods de saúde da 1.29 continuam funcionando, mas devem considerar os novos sintomas em diagnósticos/tratamentos.

## Arquivos-Chave
- `4_World/Classes/PlayerModifiers/Modifiers/diseases/Silicosis.c`
- `4_World/Classes/PlayerModifiers/Modifiers/diseases/HeatStroke.c`
- `4_World/Classes/PlayerModifiers/Modifiers/diseases/IrritatedEyes.c`
- `4_World/Classes/PlayerModifiers/Modifiers/conditions/SandstormExposure.c`
- `4_World/Classes/PlayerSymptoms/States/Secondary/FaintState.c`
- `4_World/Classes/PlayerSymptoms/States/Secondary/IrritatedEyes.c`
- `4_World/Classes/PlayerSymptoms/States/Secondary/SquintState.c`
- `4_World/Classes/TransmissionAgents/Agents/SilicosisAgent.c`
- `4_World/Classes/TransmissionAgents/Agents/EyesIrritation.c`
- `5_Mission/mission/GameplayEffectWidgets/GEWidgetsMetaDataEyeVeins.c`
- `5_Mission/mission/GameplayEffectWidgets/GEWidgetsMetaDataSquinting.c`