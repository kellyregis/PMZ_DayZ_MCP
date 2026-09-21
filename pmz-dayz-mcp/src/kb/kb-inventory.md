---
id: kb-inventory
title: Inventário (InventoryLocation, cargo, attachments, slots)
subsystem: inventory
tags: [InventoryLocation, cargo, attachments, CanReceiveItem, FindFreeLocationFor]
game_version: 1.29
last_verified: 2026-07-03
---

# Inventário

O inventário do DayZ opera sobre `EntityAI` e `InventoryLocation`, que descreve
ONDE um item está: em qual entidade, em que tipo de slot e coordenadas.

## Tipos de localização

- **Attachment** — encaixe nomeado (slot). Ex.: mira no rifle, roda no carro.
- **Cargo** — grade interna (mochila, caixa, porta-malas), com colunas/linhas.
- **Hands / Ground** — mão do player e chão.

`InventoryLocation` carrega o tipo (`ATTACHMENT`, `CARGO`, `HANDS`, `GROUND`), a
entidade-pai, o slot e a posição na grade.

## Mover itens

Prefira as rotas de alto nível a `CreateAttachment` cru:

```c
InventoryLocation dst = new InventoryLocation();
if (container.GetInventory().FindFreeLocationFor(item, FindInventoryLocationType.CARGO, dst))
    player.PredictiveTakeToDst(src, dst);
```

- `FindFreeLocationFor(item, type, out loc)` acha o primeiro espaço livre do tipo
  pedido (CARGO/ATTACHMENT/ANY). **Mova para CARGO explicitamente antes de ANY** em
  containers custom, senão o item cai em attachment e não persiste.
- `PredictiveTakeToDst` executa o move de forma sincronizada client/server.

## Hooks de controle (anti-roubo / regras)

O inventário oferece hooks de decisão. Para regras custom (containers protegidos,
zonas), a distinção crítica é ENTRADA vs SAÍDA:

- `CanReceiveItem` / `CanPutInCargo` / `CanPutAsAttachment` — controlam ENTRADA.
- `CanReleaseCargo` / `CanRemoveFromCargo` — controlam SAÍDA.

**Anti-roubo: bloqueie apenas a SAÍDA** (`CanReleaseCargo` + `CanRemoveFromCargo`).

```c
override bool CanReleaseCargo(EntityAI attachment)
{
    if (m_Locked && !IsOwner(GetHierarchyRootPlayer()))
        return false;
    return super.CanReleaseCargo(attachment);
}
```

**Nunca bloqueie `CanLoadItemIntoCargo`**: ela roda no LOAD do boot ao repovoar o
container. Bloquear apaga os itens no restart (o hive não consegue recolocá-los).

## Persistência de container no player (3 armadilhas)

1. Container anexado rouba o auto-pickup — force manual-only checando
   `GetHierarchyRootPlayer()`.
2. Serializar munição bala-a-bala explode o arquivo — use RLE com Count.
3. Sem teto de itens o acúmulo crasha — imponha `MaxItems` e cap na entrada, na
   serialização e no load.

## Attachments custom não persistem sozinhos

Itens em `attachments[]` de container custom vazam no restart. Para cargo grande,
declare `itemsCargoSize` na RAIZ do config (não numa `class Cargo` aninhada) e mova
com `FindFreeLocationFor(CARGO)` antes de qualquer coisa; evite depender de
`attachments[]` para conteúdo persistente.
