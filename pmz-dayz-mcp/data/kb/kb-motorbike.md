---
doc_id: kb-motorbike
title: "Motorbike — Novo Veículo Nativo (1.30)"
subsystem: Vehicles / Transport
category: new-system
tags: ["motorbike", "vehicle", "transport", "physics", "1.30"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# Motorbike (DayZ 1.30)

## Visão Geral
A Motorbike é um novo tipo de veículo introduzido na 1.30, com física nativa dedicada. Herda de `Transport` e possui sistemas próprios de som, fluidos, iluminação e HUD.

## Hierarquia de Classes
```
Transport
 └── Motorbike (3_Game/Vehicles/Motorbike.c) [proto native]
      ├── MotorbikeType : TransportType
      ├── MotorbikeOwnerState : TransportOwnerState
      └── MotorbikeMove : TransportMove
```

## API Principal

### Métodos da Classe Motorbike
| Método | Retorno | Descrição |
|---|---|---|
| `GetSpeedometer()` | float | Velocidade em km/h (com sinal) |
| `GetSpeedometerAbsolute()` | float | Velocidade absoluta em km/h |
| `IsAreaAtDoorFree(seat, maxH, extents, transform)` | bool | Verifica se área da porta está livre |

### Sound Controllers (`MotorbikeSoundCtrl`)
Enum nativo para controle de áudio:
- `ENGINE` — indica se motor está ligado
- `RPM` — rotação do motor
- `SPEED` — velocidade em km/h
- `PLAYER` — indica se piloto é jogador

### Fluidos (`MotorbikeFluid`)
Estende `ETransportFluid` para fluidos específicos da moto.

## Models Disponíveis
- `Motorbike_01` (4_World/Entities/Vehicles/InheritedMotorbikes/Motorbike_01.c)
- `Motorbike_02` (4_World/Entities/Vehicles/InheritedMotorbikes/Motorbike_02.c)

## Script da Moto (`MotorbikeScript`)
Gerencia estados operacionais e visuais:

### Enums de Estado
| Enum | Valores/Descrição |
|---|---|
| `MotorbikeHeadlightState` | Estados do farol |
| `MotorbikeRearLightType` | Tipo de luz traseira |
| `EMotorbikeOperationalState` | Estado operacional geral |
| `EMotorbikeDebugMode` | Modos de debug |
| `MotorbikeEngineSoundState` | Estado do som do motor |

## Actions Específicas

| Action | Arquivo | Descrição |
|---|---|---|
| `ActionStartEngineMotorBike` | Continuous/Vehicles | Ligar motor |
| `ActionStopEngineMotorBike` | SingleUse/Vehicles | Desligar motor |
| `ActionAnimateMotorbikeSeat` | Interact/Vehicles | Animar assento |
| `ActionPickUpMotorBike` | Interact/Vehicles | Pegar/levantar moto |
| `ActionRepairMotorbikeChassis` | Continuous | Reparar chassis |
| `ActionRepairMotorbikeChassisWithBlowtorch` | Continuous | Reparar chassis com maçarico |
| `ActionRepairMotorbikeEngine` | Continuous | Reparar motor |
| `ActionRepairMotorbikeEngineWithBlowtorch` | Continuous | Reparar motor com maçarico |
| `ActionRepairMotorbikePart` | Continuous | Reparar parte genérica |
| `ActionRepairMotorbikePartWithBlowTorch` | Continuous | Reparar parte com maçarico |
| `ActionVehicleHorn` | Continuous/Vehicles | Buzinar |

## Componentes Veiculares Relacionados
A 1.30 refatorou componentes veiculares que também se aplicam à moto:
- `VehicleLightsComponent` — Sistema de luzes
- `VehicleVFXComponent` — Efeitos visuais
- `VehicleHornComponent` — Buzina

### Light Profiles
- `VehicleLightProfileBase` — Base class
- `Motorbike_01`, `Motorbike_02` — Profiles específicos

## HUD
- `MotorBikeHud` (5_Mission/GUI/Vehicles/MotorBikeHud.c)
- Layout dedicado para velocímetro e indicadores

## ⚠️ Notas para Modders

1. **Física nativa:** A classe `Motorbike` é proto native. Não tente estender ou modificar a física diretamente; use os hooks de script disponíveis.
2. **Sound controllers são fixos:** O enum `MotorbikeSoundCtrl` é nativo e não deve ser modificado ou estendido.
3. **Actions seguem padrão:** As actions de reparo usam o sistema de UserActionsComponent padrão. Mods podem adicionar novas actions seguindo o mesmo padrão.
4. **Light profiles:** Para adicionar luzes customizadas, crie um novo profile herdando de `VehicleLightProfileBase`.
5. **Compatibilidade:** Mods de veículos da 1.29 NÃO funcionam com motorbikes sem adaptação específica.

## Arquivos-Chave
- `3_Game/Vehicles/Motorbike.c` — Classe nativa principal
- `4_World/Entities/Vehicles/MotorbikeScript.c` — Script de gerenciamento
- `4_World/Entities/Vehicles/InheritedMotorbikes/Motorbike_01.c` — Modelo 1
- `4_World/Entities/Vehicles/InheritedMotorbikes/Motorbike_02.c` — Modelo 2
- `4_World/Entities/Vehicles/Components/VehicleLightsComponent.c` — Luzes
- `4_World/Entities/Vehicles/Components/VehicleVFXComponent.c` — VFX
- `4_World/Entities/Vehicles/Components/VehicleHornComponent.c` — Buzina
- `5_Mission/GUI/Vehicles/MotorBikeHud.c` — HUD