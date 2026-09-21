---
id: kb-p3d-lod
title: Modelos p3d e LODs (geometria, seleções, hiddenSelections)
subsystem: modeling
tags: [p3d, LOD, named-selections, mass, hiddenSelections, binarize]
game_version: 1.29
last_verified: 2026-07-03
---

# Modelos p3d e LODs

O `.p3d` é o formato de modelo do Enfusion. Um p3d não é só malha visual: é um
conjunto de **LODs**, cada um com um papel distinto. Faltar um LOD-chave quebra
colisão, tiro ou sombra.

## LODs e seus papéis

- **Resolution / Visual LODs** — a malha renderizada, em vários níveis de detalhe por
  distância (LOD 1.0, 2.0, ...). Quanto mais longe, menos polígonos.
- **Geometry** — colisão física e cálculo de massa; também usada para o inventário
  saber o volume. Precisa ser convexa/fechada por componente.
- **View Geometry** — colisão para IA/visão/interação (o que "vê" e onde o cursor
  mira).
- **Fire Geometry** — o que recebe balas/dano. Sem ela, o objeto não é atingível.
  Componentes precisam existir na LOD de fogo para ações como `LockDoor` não
  corromperem o heap (validar `IsActionComponentPartOfSelection` antes).
- **Roadway** — superfície pisável (chão de veículo, escada, telhado onde se anda).
- **Memory** — pontos nomeados (posições de attachment, luzes, escapamento, mira,
  pontos de ação). Não tem malha, só vértices de referência.
- **Shadow Volume** — malha dedicada para sombra projetada (fechada, otimizada).
- **ViewPilot** — modelo em primeira pessoa (dentro do veículo/cockpit).

## Named selections (seleções nomeadas)

Grupos de vértices/faces com nome, usados para: hitzones (casam com `DamageSystem`),
attachment points, animação, e troca de textura (`hiddenSelections`). O mesmo nome
de seleção precisa existir na LOD correta (ex.: hitzone na Fire Geometry, ponto de
attach na Memory).

## Massa e componentes

A massa é definida na Geometry LOD (propriedade `mass` por vértice/componente),
somando o peso físico. **Componentes** são subpartes convexas nomeadas
(`Component01`, `Component02`...) na Geometry/Fire — a engine usa cada componente
como uma peça de colisão independente. Um único mesh côncavo tratado como um
componente dá colisão errada; divida em componentes convexos.

## hiddenSelections exige binarizar (ODOL)

Para um único p3d servir várias skins via `hiddenSelectionsTextures[]` por classe de
config, o modelo **precisa estar binarizado (ODOL)**. Um p3d MLOD cru (não
binarizado) **ignora** as texturas atribuídas por classe — todas as variantes saem
com a textura embutida no modelo. Binarize o p3d (Addon Builder/`config.bin` +
binarização de modelo) para as skins por config funcionarem. Sintoma clássico: "no
editor a skin muda, no servidor todas ficam iguais" = p3d não binarizado.

```c
// config.cpp
class PMZ_Casaco_Vermelho : PMZ_Casaco_Base
{
    hiddenSelections[]         = {"camoGround"};
    hiddenSelectionsTextures[] = {"\\PMZ_Mod\\data\\casaco_vermelho_co.paa"};
};
```
