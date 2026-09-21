---
id: kb-modules-layers
title: Camadas de módulos (1_Core..5_Mission) e layering
subsystem: architecture
tags: [1_Core, 3_Game, 4_World, 5_Mission, layering, ItemBase]
game_version: 1.29
last_verified: 2026-07-03
---

# Camadas de módulos e layering

O código EnforceScript é organizado em camadas numeradas, compiladas e carregadas em
ordem. Uma camada só enxerga o que foi definido em camadas ANTERIORES (números
menores). Ignorar isso gera "Can't find variable" em símbolo que "claramente
existe".

## As camadas

- **1_Core** — utilitários base da linguagem/engine (containers, math, tipos
  fundamentais). Mais baixo nível.
- **2_GameLib** — biblioteca de jogo genérica sobre o Core.
- **3_Game** — sistemas de jogo compartilhados: UI base, managers, RPC framework,
  `Man`, `PlayerBase` NÃO está aqui (ver abaixo).
- **4_World** — entidades do MUNDO: `EntityAI`, `ItemBase`, `Magazine`,
  `PlayerBase`, `CarScript`, ações, inventário concreto.
- **5_Mission** — a missão/gamemode: `MissionServer`, `MissionGameplay`,
  orquestração de alto nível, HUD.

Ordem de compilação e visibilidade: `1 → 2 → 3 → 4 → 5`. Código em 3_Game **não
enxerga** tipos definidos em 4_World.

## A armadilha central: entidades são 4_World

`ItemBase`, `Magazine`, `PlayerBase`, `CarScript` vivem em **4_World**. Se você
escreve lógica em 3_Game (ex.: um manager, um sistema em `MissionBase` ou um helper
de camada baixa) e referencia `ItemBase`/`PlayerBase` diretamente, o compilador dá
**"Can't find variable ItemBase"** — a camada 3 não conhece o tipo.

Solução: **mova a lógica que toca a entidade para um helper em 4_World** e chame-o
das camadas superiores por interface/typename genérico, ou faça o próprio 4_World
registrar-se num manager de 3_Game.

```c
// ERRADO: em 3_Game
class PMZ_Sistema { void F(ItemBase item) { } }   // Can't find variable ItemBase

// CERTO: helper em 4_World
class PMZ_ItemHelper { static void F(ItemBase item) { } }  // 4_World enxerga ItemBase
```

## Server vs client vs mission

Além da estratificação por camada, há separação por CONTEXTO de execução:

- Lógica autoritativa (economia, persistência, validação) roda no **servidor**
  (`MissionServer`, guards `IsServer()`).
- UI/input roda no **cliente** (`MissionGameplay`, `IsClient()`).
- Um mod cliente+_Server tipicamente coloca a lógica server-only no **shared** com
  guarda `IsServer()`, e o `_Server` vira um bootstrap fino — assim o PBO cliente
  ainda compila as chamadas.

## Regra prática

Antes de referenciar um tipo, pergunte "em que camada ele nasce?". Se é entidade do
mundo, seu código também precisa estar em 4_World (ou acima) para vê-lo. "Can't find
variable" num tipo conhecido é quase sempre violação de layering, não erro de
digitação.
