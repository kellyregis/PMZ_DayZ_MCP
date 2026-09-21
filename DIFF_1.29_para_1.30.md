# DIFF: DayZ 1.29 → 1.30 (Experimental)
> **Gerado em:** 2026-09-21 · **Fonte:** Scripts vanilla DayZ 1.30 experimental vs 1.29 stable
> **Indexação:** PMZ DayZ MCP (parser EnScript customizado, SQLite)
> **Status:** 1.30 em experimental — sujeito a mudanças antes do release oficial

---

## Resumo Numérico

| Métrica | 1.29 | 1.30 | Delta |
|---|---|---|---|
| Arquivos .c | 2.804 | 3.042 | **+238** |
| Classes | 6.101 | 6.783 | **+682** |
| Métodos | 28.690 | 31.246 | **+2.556** |
| Enums | ~410 | 431 | **+21** |
| Layouts .layout | 214 | 227 | **+13** |
| RPCs (ERPCs) | ~178 | ~193 | **+15** |
| Parse quality | 100% ok | 100% ok | ✅ |

### Breakdown por Módulo (1.30)
| Módulo | Arquivos | Delta vs 1.29 |
|---|---|---|
| 1_Core | 45 | = |
| 2_GameLib | 13 | = |
| 3_Game | 440 | +25 |
| 4_World | 2.317 | +202 |
| 5_Mission | 219 | +10 |

---

## Arquivos Novos na 1.30 (239)

### 3_Game (25 novos)
- `CfgBunkerBroadcastHandler.c` — Config handler do sistema de broadcast de bunkers
- `CfgBunkerBroadcastJsonData.c` — Estruturas JSON para broadcast
- `DoOnce.c` — Utilitário de execução única
- `DustKickupEffects.c` — Efeitos de poeira por movimento
- `Effects/EffectParticle/BulletImpactBase/Hit_Desert_Sand.c` — Impacto em areia desértica
- `Effects/EffectParticle/BulletImpactBase/Hit_Mud_Brick.c` — Impacto em tijolo de barro
- `Entities/AdditionalDoorsInfo.c` — Dados adicionais de portas
- `Entities/CachedInfosInstanced.c` — Cache de informações instanciadas
- `Entities/StaticObjectType.c` — Tipo de objeto estático
- `Entities/TypeAttachmentGroupData.c` — Dados de grupo de attachment por tipo
- `Entities/TypeAttachmentGroupDataHolders.c` — Holders de dados de attachment
- `Enums/EDiagMenuGame.c` — Enum de menu diagnóstico
- `Enums/ELiquidSourceObjectType.c` — Enum de fonte de líquido
- `Enums/EVehicleVFXTypes.c` — Enum de VFX veicular
- `GeyserDebugData.c` — Dados de debug de gêiser
- `MorseCodeConverter.c` — Conversor de código morse (usado em BunkerBroadcast)
- `PPEManager/Requesters/PPERSandstorm.c` — Post-process effect da sandstorm
- `PPEManager/Requesters/PPERSquintEffects.c` — Efeito de squint (olhos semicerrados)
- `Sandstorm.c` — **Controller principal da Sandstorm** (server-side)
- `Services/ContentDLCStorePrompt.c` — Prompt de loja DLC
- `Systems/ConstructionTypeData_Basic.c` — Dados de tipo de construção básica
- `Systems/Construction_Basic.c` — **Classe base do sistema de construção**
- `Systems/DynamicMusicPlayer/DynamicMusicPlayerRegistryNasdara.c` — Registro de música dinâmica Nasdara
- `Systems/WorldTimeTracker.c` — Rastreador de tempo mundial
- `Vehicles/Motorbike.c` — **Classe nativa Motorbike** (extends Transport)

### 4_World (202 novos)

#### Base Building / Construction (18)
- `Classes/BaseBuilding/ConstructionConstants.c` — Constantes e enums de construção
- `Classes/BaseBuilding/ConstructionDebugs.c` — Debug de construção
- `Classes/BaseBuilding/ConstructionInitData.c` — Dados de inicialização de partes
- `Classes/BaseBuilding/ConstructionMaterials.c` — Materiais de construção
- `Classes/BaseBuilding/RebuildingSpawner.c` — Spawner de rebuilding
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildInvertedTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildReversibleBarricadeTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildReversibleBaseTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildReversibleDoorTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildRubbleTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartRebuildTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartTyped.c`
- `Classes/BaseBuilding/TypeConstructionData/ConstructionPartTypedHolder.c`
- `Classes/ConstructionBase.c` — **Base class para construção/rebuilding**
- `Classes/ConstructionManagerStatic.c` — Manager estático de construção
- `Classes/Rebuilding/ConstructionEffects.c` — Efeitos visuais de construção
- `Classes/Rebuilding/ConstructionStatics.c` — Estáticos de construção
- `Classes/Rebuilding/Rebuilding.c` — **Sistema de Rebuilding** (extends ConstructionBase)

#### Bunker Broadcast (4)
- `Classes/BunkerBroadcastComponent.c` — Componente de broadcast
- `Classes/BunkerBroadcastHandler.c` — Handler com persistência
- `Classes/BunkerBroadcastProxy.c` — Proxy de broadcast
- `Classes/BunkerBroadcastScheduler.c` — Scheduler de broadcasts

#### CodeLock (2)
- `Classes/CodeLockComponent.c` — **Componente de fechadura digital** (PIN 4-6 dígitos)
- `Classes/CodeLockVisualManager.c` — Gerenciamento visual do codelock

#### Player Modifiers / Symptoms (7)
- `Classes/PlayerModifiers/Modifiers/conditions/SandstormExposure.c` — Exposição à sandstorm
- `Classes/PlayerModifiers/Modifiers/diseases/HeatStroke.c` — Insolação
- `Classes/PlayerModifiers/Modifiers/diseases/IrritatedEyes.c` — Olhos irritados
- `Classes/PlayerModifiers/Modifiers/diseases/Silicosis.c` — Silicose
- `Classes/PlayerSymptoms/States/Secondary/FaintState.c` — Estado de desmaio
- `Classes/PlayerSymptoms/States/Secondary/IrritatedEyes.c` — Sintoma visual
- `Classes/PlayerSymptoms/States/Secondary/SquintState.c` — Estado de squint

#### Recipes (12)
- `CloseGunCase.c`, `OpenGunCase.c` — Gun case
- `CraftHandDrillKitBirch.c`, `CraftHandDrillKitPalm.c` — Hand drill kits
- `DeCraftHandDrillKitBirch.c`, `DeCraftHandDrillKitPalm.c` — Decraft
- `CraftLeatherBelt.c`, `CraftLeatherHippack.c`, `CraftLeatherSheath.c` — Leather crafting
- `CraftMortarMix.c`, `CraftWaterskin.c`, `DeCraftWaterskin.c` — Mortar e waterskin
- `PrepareCatfish.c`, `PrepareLizard.c` — Preparação de alimentos

#### Recoils (5)
- `LeeEnfieldRecoil.c`, `LugerRecoil.c`, `MP18Recoil.c`, `SCARHRecoil.c`, `SCARLRecoil.c`

#### User Actions (30+)
- **Motorbike:** `ActionRepairMotorbikeChassis.c`, `ActionRepairMotorbikeEngine.c`, `ActionRepairMotorbikePart.c`, `ActionAnimateMotorbikeSeat.c`, `ActionPickUpMotorBike.c`, `ActionStartEngineMotorBike.c`, `ActionStopEngineMotorBike.c`, `ActionVehicleHorn.c` (+ variantes com blowtorch)
- **Construction:** `ActionBuildPartInstant.c`, `ActionDestroyPartInstant.c`, `ActionDismantlePartInstant.c`, `ActionPickUpBricks.c`
- **CodeLock:** `ActionCombinationLockUnlock.c`, `ActionInteractCodeLockBase.c`, `ActionInteractCodeLockItem.c`, `ActionResetCodeOnCodeLock..c`
- **Líquidos:** `ActionDrinkWellContinuousBucket.c`, `ActionMixMortarAtWater.c`, `ActionMixMortarAtWell.c`, `ActionObtainLiquidBase.c`
- **Lavagem:** `ActionWashHeadItemContinuous.c`, `ActionWashHeadWater .c`, `ActionWashHeadWell.c`, `ActionWetClothingFromContainer.c`, `ActionWetClothingInHandsBase.c`, `ActionWetClothingInHandsWater.c`, `ActionWetClothingInHandsWell.c`
- **Outros:** `ActionDetachBattery.c`, `ActionPartInfo.c`

#### Veículos / Lights / VFX (12)
- `Entities/Vehicles/Components/VehicleHornComponent.c`
- `Entities/Vehicles/Components/VehicleLightsComponent.c`
- `Entities/Vehicles/Components/VehicleVFXComponent.c`
- `Entities/Vehicles/InheritedMotorbikes/Motorbike_01.c`, `Motorbike_02.c`
- `Entities/Vehicles/MotorbikeScript.c`
- `Entities/ScriptedLightBase/SpotLightBase/VehicleLightBase.c`
- Profiles: `CivilianSedan.c`, `Hatchback_02.c`, `Motorbike_01.c`, `Motorbike_02.c`, `OffroadHatchback.c`, `Offroad_02.c`, `Sedan_02.c`, `Truck_01.c`, `VehicleLightProfileBase.c`

#### Outros 4_World
- `Classes/ContaminatedArea/OilPitArea.c` — Poço de petróleo contaminado
- `Classes/Dust/DustEffectCeilingHandler.c`, `DustEffectsManager.c` — Gerenciamento de poeira
- `Classes/SoundEvents/PlayerSoundEvents/Events/HeavyBreathEvents.c`
- `Classes/ThermalBiasHandler.c`
- `Classes/TransmissionAgents/Agents/EyesIrritation.c`, `SilicosisAgent.c`
- `Classes/Worlds/Nasdara.c` — Novo mapa/região
- `DigitalCodeLockUIBase.c`
- `Entities/Building/Bunker.c`, `Land_WaterWell_Brick.c`
- `Entities/Building/Rebuildable/` — 12 buildings rebuildable (House_1M1-M5, House_1S1-S2, House_2M1-M2, House_2S1, House_3S1-S2, IrrigationTunnel_Entrance)
- `Entities/Building/Residential/Houses/Land_House_2S2.c`, `Misc/Land_Water_Well1.c`, `Land_Water_Well2.c`
- `Entities/Building/Wrecks/Wreck_Chinook.c`, `Wreck_Mi24_TK.c`, `Wreck_Truck01_Aban1_Cistern.c`, `Wreck_Truck01_Aban2_Cistern.c`
- `Entities/Core/Inherited/EntityAI.c`
- `Entities/Effects/EffCloudDust.c`, `EffWheelContact.c`, `VehicleDust.c`
- `Entities/Firearms/AutomaticRifle/SCARL.c`, `Pistol/Luger.c`, `Rifle/LeeEnfield.c`, `SMG/MP18.c`
- `Entities/ItemBase/` — ~40 novos itens (Akinaka, BrickTrowel, Catfish, CodeLock, CommonBrick, DonerKnife, Figs, GunCase, Jambiya, Lizard, MortarMix, PileOfBricks, PoliceBaton, Scimitar, roupas Nasdara, etc.)
- `Entities/ItemBaseType.c`
- `Entities/NavmeshTest/NavmeshTest.c`
- `Entities/ScriptedEntities/Triggers/OilPitTrigger.c`
- `Plugins/PluginBase/PluginUndergroundTriggerManager.c`
- `Systems/Bot/BotStateMachineData.c`, `Bot_Attack.c`, `Bot_MoveForward.c`, `Bot_MovementRandomizer.c`, `Bot_TurnToValidForward.c`, `RoboclientUtils.c`
- `Systems/Sandstorm/PlayerSandstormData.c`, `ScriptedSandstormController.c`

### 5_Mission (12 novos)
- `GUI/DigitalCodeLockUI.c` — UI da fechadura digital
- `GUI/InventoryNew/ContainedItems/ActionInfoGrids.c`, `ActionInfoPanels.c`, `ConstructionInfoIcons.c`, `GenericIcon.c`, `SlotsIconBase.c`
- `GUI/NewUI/Keybindings/KeybindingsEntryWindow.c`
- `GUI/ScriptConsoleMenuElement.c`
- `GUI/UndergroundTriggerEditorMenu.c` — Editor de triggers subterrâneos
- `GUI/Vehicles/MotorBikeHud.c` — HUD da moto
- `mission/GameplayEffectWidgets/GEWidgetsMetaDataEyeVeins.c`, `GEWidgetsMetaDataSquinting.c`

---

## Arquivos Removidos na 1.30 (1)
- `5_Mission/mission/MissionBenchmark.c` — Benchmark removido

---

## Novos RPCs (15)

### Produção
| RPC | Descrição |
|---|---|
| `RPC_BUNKERBROADCAST_CONFIG_SYNC` | Sincroniza config de broadcast de bunkers |
| `RPC_CODE_LOCK_REQUEST` | Requisição de interação com codelock |
| `RPC_CODE_LOCK_RESPONSE` | Resposta do servidor sobre codelock |
| `RPC_CODE_LOCK_UI_ACTION` | Ação de UI no codelock (input/confirma/clear) |
| `RPC_ITEM_SOUND_PLAY` | Toca som em item |
| `RPC_ITEM_SOUND_STOP` | Para som em item |
| `RPC_SYMPTOM_PARAM_SYNC` | Sincroniza parâmetros de sintomas |

### Dev/Diag
| RPC | Descrição |
|---|---|
| `DEV_SET_SANDSTORM` | Força sandstorm (dev) |
| `DEV_SET_SANDSTORM_WEATHER` | Força sandstorm via weather (dev) |
| `DEV_STOP_SANDSTORM` | Para sandstorm (dev) |
| `DEV_STOP_SANDSTORM_WEATHER` | Para sandstorm via weather (dev) |
| `DIAG_BASEBUILDING_FASTBUILD` | Fast build para debug |
| `DIAG_MISC_RADIOGAMEPLAY_BUNKERS_LIST` | Lista bunkers ativos |
| `DIAG_MISC_RADIOGAMEPLAY_DEBUG_DATA` | Dados de debug radio gameplay |
| `DIAG_RADIO_GAMEPLAY_LOGGING` | Logging de radio gameplay |

---

## Novos Enums (21)

| Enum | Arquivo | Uso |
|---|---|---|
| `EDiagMenuGame` | `3_Game/Enums/EDiagMenuGame.c` | Menu de diagnóstico in-game |
| `ELiquidSourceObjectType` | `3_Game/Enums/ELiquidSourceObjectType.c` | Tipos de fonte de líquido |
| `EVehicleVFXEffect` | `3_Game/Enums/EVehicleVFXTypes.c` | Efeitos VFX veiculares |
| `EVehicleVFXEffectGroup` | `3_Game/Enums/EVehicleVFXTypes.c` | Grupos de VFX veiculares |
| `MotorbikeSoundCtrl` | `3_Game/Vehicles/Motorbike.c` | Sound controllers da moto (ENGINE, RPM, SPEED, PLAYER) |
| `MotorbikeFluid` | `3_Game/Vehicles/Motorbike.c` | Fluidos da moto (extends ETransportFluid) |
| `EConstructionInfoCategories` | `4_World/Classes/BaseBuilding/ConstructionConstants.c` | Categorias de info de construção |
| `EConstructionTools` | `4_World/Classes/BaseBuilding/ConstructionConstants.c` | Ferramentas de construção |
| `CodeLockStage` | `4_World/Classes/CodeLockComponent.c` | Estados: NONE, NORMAL, SETTING, PROTECTION_STAGE_ONE/TWO |
| `CodeLockUIAction` | `4_World/Classes/CodeLockComponent.c` | Ações UI: NONE, CONFIRM_INPUT, CLEAR_INPUT, DIGIT_INPUT |
| `CodeLockLightState` | `4_World/Classes/CodeLockVisualManager.c` | Estados de luz do codelock |
| `ConstructionMaterialType` | `4_World/Classes/ConstructionBase.c` | Tipos de material de construção |
| `EConstructionDirCheckType` | `4_World/Classes/ConstructionBase.c` | Verificação de direção |
| `EConstructionDebugModes` | `4_World/Classes/ConstructionBase.c` | Modos de debug |
| `EOilPitState` | `4_World/Classes/ContaminatedArea/OilPitArea.c` | Estados do poço de petróleo |
| `MotorbikeHeadlightState` | `4_World/Entities/Vehicles/MotorbikeScript.c` | Estado do farol |
| `MotorbikeRearLightType` | `4_World/Entities/Vehicles/MotorbikeScript.c` | Tipo de luz traseira |
| `EMotorbikeOperationalState` | `4_World/Entities/Vehicles/MotorbikeScript.c` | Estado operacional |
| `EMotorbikeDebugMode` | `4_World/Entities/Vehicles/MotorbikeScript.c` | Modo debug |
| `MotorbikeEngineSoundState` | `4_World/Entities/Vehicles/MotorbikeScript.c` | Estado do som do motor |
| `eConstructionIconItemState` | `5_Mission/GUI/.../ConstructionInfoIcons.c` | Estado do ícone de construção |

---

## Novos Layouts GUI (13)
- `day_z_digital_lock.layout` — UI do codelock
- `day_z_digital_lock_backup.layout` — Backup do layout
- `gameplay/EyeSquintEffects.layout` — Overlay de squint
- `gameplay/EyeVeinsEffects.layout` — Overlay de veias nos olhos
- `new_ui/hud/SimpleIconTemplate.layout` — Template de ícone simples
- `new_ui/hud/action_info_spacer.layout` — Spacer de info de ação
- `new_ui/tutorials/pc/tutorials_720p.layout` — Tutorial PC 720p
- `new_ui/tutorials/xbox/tutorials_720p.layout` — Tutorial Xbox 720p
- `script_console/script_console_menu_element.layout` — Elemento do console
- `underground_trigger_editor/day_z_underground_trigger_editor.layout` — Editor de triggers
- `underground_trigger_editor/day_z_underground_trigger_editor_list_item.layout`
- `underground_trigger_editor/day_z_underground_trigger_editor_popup_dialog.layout`
- `underground_trigger_editor/day_z_underground_trigger_editor_popup_dialog_input.layout`

---

## Sistemas Críticos Novos

### 1. Sandstorm (Clima)
- **Controller:** `SandstormController` (proto native, server-only)
- **Acesso:** `Weather::GetSandstorm()`
- **API:** `Start(duration)`, `Stop(duration)`, `IsActive()`, `GetDirection()`, `GetPosition()`, `GetSpeed()`, `GetRemainingMovementDuration()`, `IsPositionAtEnd()`
- **Exposição do jogador:** `SandstormExposure` modifier
- **PPE:** `PPERequester_SandstormEffect`
- **Persistência:** `PlayerSandstormData`, `ScriptedSandstormController`
- ⚠️ **SERVER-ONLY:** Criação/control é server-side; cliente recebe replicação

### 2. Construction / Rebuilding (Base Building Refatorado)
- **Hierarquia:** `ConstructionBasic` → `ConstructionBase` → `Rebuilding`
- **Parts tipadas:** `ConstructionPartTyped`, `ConstructionPartRebuildTyped`, variantes (Inverted, Reversible, Rubble, Barricade, Door)
- **Persistência:** `HandleStoreSave/Load` com versionamento (`REBUILDING_STORAGE_VERSION = 1`)
- **Decay:** `ProcessConstructionDecay()`, configurável via `CfgGameplayHandler.GetDisableBaseDecay()`
- **Actions:** Build/Dismantle/Destroy (instant + continuous), com suporte a blowtorch
- **Materials:** `ConstructionMaterialData`, `ConstructionMaterials`
- **Buildings rebuildable:** 12 novos (House_1M1-M5, House_1S1-S2, House_2M1-M2, House_2S1, House_3S1-S2, IrrigationTunnel)

### 3. Motorbike (Novo Veículo)
- **Classe:** `Motorbike extends Transport` (nativa)
- **Tipos auxiliares:** `MotorbikeType`, `MotorbikeOwnerState`, `MotorbikeMove`
- **Sound controllers:** `MotorbikeSoundCtrl` (ENGINE, RPM, SPEED, PLAYER)
- **Fluids:** `MotorbikeFluid extends ETransportFluid`
- **API:** `GetSpeedometer()`, `GetSpeedometerAbsolute()`, `IsAreaAtDoorFree()`
- **Models:** `Motorbike_01`, `Motorbike_02`
- **Actions:** Start/Stop engine, Animate seat, Pick up, Repair (chassis/engine/part ± blowtorch), Horn
- **HUD:** `MotorBikeHud`
- **Lights:** `VehicleLightProfileBase` + profiles específicos

### 4. CodeLock (Fechadura Digital)
- **Componente:** `CodeLockComponent extends Managed`
- **PIN:** 4-6 dígitos (`MIN_LOCK_PIN_LENGTH=4`, `MAX_LOCK_PIN_LENGTH=6`)
- **Estados:** `CodeLockStage` (NONE, NORMAL, SETTING, PROTECTION_STAGE_ONE, PROTECTION_STAGE_TWO)
- **Brute-force protection:** Timer (30s default) + reset (3600s default) + wrong code count
- **RPCs:** `RPC_CODE_LOCK_REQUEST`, `RPC_CODE_LOCK_RESPONSE`, `RPC_CODE_LOCK_UI_ACTION`
- **UI:** `DigitalCodeLockUI` (layout dedicado)
- **Item:** `CodeLock` (item base)

### 5. Bunker Broadcast
- **Handler:** `BunkerBroadcastHandler` com persistência (`$mission:BunkerBroadcastPersistenceStorage.bin`)
- **Scheduler:** `BunkerBroadcastScheduler` com horários configuráveis
- **Config sync:** `RPC_BUNKERBROADCAST_CONFIG_SYNC`
- **Component:** `BunkerBroadcastComponent` (attachable)
- **Proxy:** `BunkerBroadcastProxy` para spawn
- **Morse code:** `MorseCodeConverter` / `BunkerBroadcastManager`

### 6. Novos Sintomas e Doenças
- **Silicosis:** `Silicosis` modifier + `SilicosisAgent` transmission agent
- **HeatStroke:** Modifier de insolação
- **IrritatedEyes:** Modifier + symptom state + `EyesIrritation` agent
- **FaintState:** Estado secundário de desmaio
- **SquintState:** Estado de olhos semicerrados + PPE requester
- **Sync:** `RPC_SYMPTOM_PARAM_SYNC` para sincronização de parâmetros

### 7. Vehicle Components Refatorados
- `VehicleLightsComponent` — Luzes extraídas para componente dedicado
- `VehicleVFXComponent` — VFX veicular como componente (`EVehicleVFXEffect`, `EVehicleVFXEffectGroup`)
- `VehicleHornComponent` — Buzina como componente
- **Profiles por veículo:** CivilianSedan, Hatchback_02, Motorbike_01/02, OffroadHatchback, Offroad_02, Sedan_02, Truck_01

---

## Arquivos Modificados (615 por tamanho)

Os 615 arquivos com mesmo nome mas tamanho diferente entre 1.29 e 1.30 incluem mudanças em APIs centrais:

### Alto Impacto (mods existentes podem quebrar)
- `1_Core/constants.c` — Novas constantes globais
- `1_Core/proto/EnScript.c`, `EnWorld.c`, `EnMath3D.c`, `EnConvert.c` — Proto natives novos/alterados
- `3_Game/DayZGame.c`, `Global/Game.c`, `Global/World.c` — Core game loop
- `3_Game/Entities/EntityAI.c`, `Man.c`, `Entity.c`, `Object.c` — Base entities
- `3_Game/Systems/Inventory/*` (6 arquivos) — Inventário estendido
- `3_Game/DamageSystem.c` — Damage zones
- `3_Game/CE/CentralEconomy.c` — Central Economy
- `3_Game/Enums/ERPCs.c` — 15 novos RPCs
- `3_Game/Enums/EActions.c` — Novas ações

### Médio Impacto
- `3_Game/AmmoEffects.c`, `Colors.c`, `Noise.c`, `SurfaceInfo.c`
- `3_Game/Effects/*` — Efeitos expandidos
- `3_Game/PPEManager/*` — Post-process effects
- `3_Game/Vehicles/Boat.c` — Veículos base
- `4_World/Classes/PlayerModifiers/*` — Novos modifiers
- `4_World/Classes/Cooking/*`, `FoodStage/*` — Cooking system

---

## Notas de Migração para Modders

1. **Construction API mudou radicalmente.** Mods de base building devem migrar de `ConstructionBase` antigo para a nova hierarquia `ConstructionBasic → ConstructionBase → Rebuilding`. Parts agora são tipadas.
2. **Sandstorm é SERVER-ONLY.** Não tente criar/controlar sandstorm no cliente. Use `Weather::GetSandstorm()` apenas para leitura client-side.
3. **Novos RPCs exigem registro.** Se seu mod usa RPCs customizados, verifique conflitos com os 15 novos RPCs vanilla.
4. **Vehicle components refatorados.** Mods que acessam luzes/VFX/buzina diretamente devem migrar para os novos componentes (`VehicleLightsComponent`, `VehicleVFXComponent`, `VehicleHornComponent`).
5. **CodeLock adicionado.** Mods de segurança/base building podem integrar com `CodeLockComponent` em vez de implementar soluções customizadas.
6. **Novos sintomas.** Mods de saúde/sintomas devem considerar `Silicosis`, `HeatStroke`, `IrritatedEyes` e o novo `RPC_SYMPTOM_PARAM_SYNC`.
7. **MissionBenchmark removido.** Se algum mod dependia dessa classe, remover referência.

---

*Documento gerado automaticamente pelo PMZ DayZ MCP a partir da indexação SQLite dos scripts vanilla DayZ 1.30 experimental.*