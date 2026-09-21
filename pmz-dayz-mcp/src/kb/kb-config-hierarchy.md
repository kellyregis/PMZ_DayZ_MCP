---
id: kb-config-hierarchy
title: Hierarquia de config (CfgVehicles, herança, scope)
subsystem: config
tags: [CfgVehicles, scope, simulation, DamageSystem, CfgSpawnableTypes]
game_version: 1.29
last_verified: 2026-07-03
---

# Hierarquia de config

`config.cpp` descreve as classes de conteúdo. A herança usa `class Filho : Pai`, e o
filho herda TODOS os parâmetros do pai, sobrescrevendo apenas o que redeclara.

```c
class CfgVehicles
{
    class Inventory_Base;              // forward declaration do pai
    class PMZ_Cofre : Inventory_Base   // herda de Inventory_Base
    {
        scope = 2;
        displayName = "Cofre PMZ";
        model = "\\PMZ_Mod\\data\\cofre.p3d";
        itemsCargoSize[] = {6, 4};     // cargo na RAIZ, não em subclasse
        class DamageSystem { /* ... */ };
    };
};
```

## scope

Controla visibilidade da classe:

- `scope = 0` — hidden; base abstrata, não spawnável nem no editor.
- `scope = 1` — protected; spawnável por script/CE, oculto no menu do editor.
- `scope = 2` — public; totalmente visível/spawnável.

Bases das quais você só herda ficam `scope = 0`.

## simulation e DamageSystem

- `simulation` define o comportamento de simulação do item (weapon, inventory,
  clothing, etc.) — herdado do pai; só troque se muda a natureza do item.
- `class DamageSystem` descreve zonas de dano, resistências e health levels. É um
  bloco herdável; ao sobrescrever, redeclare a estrutura inteira que você precisa —
  merge parcial de blocos aninhados é traiçoeiro.

## Override de parâmetro herdado

Para mudar só um valor herdado, redeclare a classe com o mesmo nome no seu config e
altere o campo. O restante permanece do pai. Para modar conteúdo vanilla, use
`class X;` (forward decl) para "abrir" a classe existente e então redeclarar o campo.

## CfgSpawnableTypes

Define o que a Central Economy pode injetar dentro do item ao spawná-lo
(attachments, cargo, presets):

```c
class CfgSpawnableTypes
{
    class PMZ_Cofre
    {
        attachments[] = {};
        class cargo { /* presets de loot interno */ };
    };
};
```

## Armadilha: case-insensitive → "Member already defined"

Os nomes de classe em `CfgWorlds`/`CfgVehicles` são **case-insensitive**. Declarar
`Foo` e `foo` como classes distintas gera erro de compilação "Member already
defined". Padronize a capitalização e faça grep de colisões antes de fechar o
config. Lembre também: o servidor compila o `.pbo`, não o `.cpp`/`.c` solto na pasta
— re-empacote sempre após editar config.
