---
id: kb-actions
title: Sistema de ações (ActionBase, AddAction, ActionConstructor)
subsystem: actions
tags: [ActionBase, ActionContinuousBase, ActionInteractBase, ActionConstructor, ActionTarget]
game_version: 1.29
last_verified: 2026-07-03
---

# Sistema de ações

Ações são as interações de jogador (F / scroll) sobre itens e objetos do mundo.
A hierarquia base define o comportamento temporal:

- **`ActionBase`** — raiz; instantânea/single-use.
- **`ActionContinuousBase`** — mantém pressionado até completar (curar, serrar,
  usar item na mão sobre um alvo).
- **`ActionInteractBase`** — interação rápida por tap (F), tipicamente sem item na
  mão ou com alvo simples.

## Registrar a ação e expor no item

Duas coisas precisam existir, ou a ação **falha silenciosa** (F/scroll nunca
aparece):

1. Sobrescrever `SetActions()` no item e `AddAction`:

```c
override void SetActions()
{
    super.SetActions();
    AddAction(PMZ_ActionAbrirCofre);
}
```

2. Registrar a classe da ação em `ActionConstructor.RegisterActions()` via modded:

```c
modded class ActionConstructor
{
    override void RegisterActions(TTypenameActionMap actions)
    {
        super.RegisterActions(actions);
        AddAction(PMZ_ActionAbrirCofre, actions);
    }
}
```

Sem o passo 2, o `AddAction` do item não encontra a ação registrada e nada aparece.
É o **primeiro lugar a checar** quando "a ação não aparece".

## Anatomia de uma ação

```c
class PMZ_ActionAbrirCofre : ActionContinuousBase
{
    void PMZ_ActionAbrirCofre() { m_CommandUID = DayZPlayerConstants.CMD_ACTIONFB_OPEN; }

    override void CreateConditionComponents()
    {
        m_ConditionItem   = new CCINonRuined;      // condição do item na mão
        m_ConditionTarget = new CCTObject(UAMaxDistances.DEFAULT); // condição do alvo
    }

    override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
    {
        Object obj = target.GetObject();
        return obj && obj.IsInherited(PMZ_Cofre);
    }

    override void OnExecuteServer(ActionData action_data) { /* lógica autoritativa */ }
}
```

- `ActionCondition` decide se a ação aparece/segue válida a cada frame — mantenha
  barata.
- `ActionTarget` traz o objeto/componente sob mira (`GetObject`, `GetComponentIndex`).

## Armadilhas por tipo de alvo

- **Item na mão usado sobre um objeto do mundo** (ex.: chave numa caixa trancada):
  precisa ser `ActionContinuousBase`. Com `ActionInteractBase` o F simplesmente não
  dispara.
- **Alvo é prédio/porta**: sobrescreva `IsLockTargetOnUse()` para retornar `false`.
  Sem isso a engine tenta travar o alvo em `AddActionJuncture` e **crasha**
  (GetInventory null em objeto sem inventário).
- **Concorrência com ação vanilla**: quando uma `ActionContinuous` vanilla disputa o
  mesmo alvo, o F "precisa de várias tentativas". Mode a `ActionCondition` da vanilla
  para escondê-la no seu contexto.
- **Ação admin instantânea via holograma/RPC**: use `IsLocal()==true` senão espera
  ACK do servidor que nunca vem em listen/self-host (rodinha infinita).
