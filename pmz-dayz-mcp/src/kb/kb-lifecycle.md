---
id: kb-lifecycle
title: Ciclo de vida de entidades (EEInit, EEDelete, EEKilled)
subsystem: lifecycle
tags: [EEInit, EEDelete, EEKilled, EEHitBy, EEItemLocationChanged, EEOnCECreate]
game_version: 1.29
last_verified: 2026-07-03
---

# Ciclo de vida de entidades

A engine emite "Entity Events" (`EE*`) nos marcos da vida de uma `EntityAI`. Use-os
em vez de polling. O construtor e `Init()` rodam cedo demais para tocar o mundo;
`EEInit` é o ponto seguro de inicialização.

## Marcos principais

- **Construtor** — só inicialize campos POD. O objeto ainda não está no mundo, sem
  inventário garantido, sem rede.
- **`Init()`** — setup lógico inicial (registrar states, valores default). Ainda não
  assuma attachments carregados.
- **`EEInit()`** — entidade já existe no mundo; ponto para agendar timers, registrar
  callbacks, ligar em UpdateQueue, indexar em estruturas espaciais.
- **`EEOnCECreate()`** — chamado quando a Central Economy cria o objeto (loot spawn);
  bom lugar para randomização inicial de estado ligada ao spawn de CE.
- **`EEItemLocationChanged(oldLoc, newLoc)`** — item mudou de lugar (pegou, soltou,
  moveu de container). Base para lógica de attach/detach.
- **`EEHealthLevelChanged(oldLevel, newLevel, zone)`** — cruzou nível de dano
  (PRISTINE..RUINED). Use para reação visual/estado, não polling de HP.
- **`EEHitBy(...)`** — recebeu dano de uma fonte; base para reações a impacto.
- **`EEKilled(killer)`** — entidade morreu.
- **`EEDelete(parent)`** — entidade vai ser destruída. **Limpe tudo aqui.**

## EEDelete: limpeza obrigatória

Callbacks registrados no `GetUpdateQueue`/`GetDayZGame().GetUpdateQueue` são
chamados por-frame. Se a entidade morre e você não removeu o callback, a engine
chama `OnUpdate` num objeto já destruído → **crash** ("OnUpdate" em objeto morto).

```c
override void EEInit()
{
    super.EEInit();
    GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).CallLater(MeuTick, 1000, true);
}

override void EEDelete(EntityAI parent)
{
    GetGame().GetCallQueue(CALL_CATEGORY_SYSTEM).Remove(MeuTick); // idem UpdateQueue.Remove
    super.EEDelete(parent);
}
```

Remova timers de `CallQueue`, callbacks de `UpdateQueue` e desregistre de índices
espaciais no `EEDelete`.

## EEKilled e compat com mods de revive

Mods de revive (IsAlive) seguram o player em limbo mantendo `GetHealth("","Health")`
no máximo. Um `EEKilled` que limpa estado (dropar maleta, apagar bind) pode disparar
sobre um "morto" que na verdade vai reviver. Padrão de compat: após o `super`,
retorne cedo se ainda há vida.

```c
override void EEKilled(Object killer)
{
    super.EEKilled(killer);
    if (GetHealth("", "Health") > 0) // em limbo de revive: não limpe estado
        return;
    LimparEstadoDefinitivo();
}
```

Cuidado adicional: give-up/timeout de revive só faz `SetHealth(0)` e **não redispara
`EEKilled`**. Para morte real definitiva nesses fluxos, use um evento explícito
(ex.: EventBus `PMZ_IsAlive_PlayerRealDeath`) em vez de esperar um segundo
`EEKilled`.
