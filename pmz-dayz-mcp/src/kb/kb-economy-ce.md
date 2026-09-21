---
id: kb-economy-ce
title: Central Economy (types.xml, events.xml, spawn)
subsystem: economy
tags: [types.xml, events.xml, cfgeconomycore, lifetime, nominal, restock]
game_version: 1.29
last_verified: 2026-07-03
---

# Central Economy (CE)

A Central Economy é o sistema server-side que povoa o mapa com loot e eventos. É
configurada por arquivos XML no `mpmissions/<mapa>/db/` e pastas de economy.

## types.xml — o item

Cada `<type name="...">` controla quantos existem e por quanto tempo:

```xml
<type name="PMZ_Cofre">
    <nominal>15</nominal>
    <lifetime>14400</lifetime>
    <restock>1800</restock>
    <min>8</min>
    <quantmin>-1</quantmin>
    <quantmax>-1</quantmax>
    <usage name="Military" />
    <tier>Tier3</tier>
    <flags count_in_cargo="0" count_in_hoarder="0" count_in_map="1" count_in_player="0"/>
</type>
```

- `nominal` — quantidade-alvo no mapa.
- `min` — quando o total cai abaixo disso, a CE agenda respawn.
- `lifetime` — segundos até o item despawnar se intocado (contagem reinicia quando
  um player interage).
- `restock` — atraso para repor após consumo, aproximando de `nominal`.
- `usage` — categoria de local (Military, Police, Farm...) que casa com
  `mapgrouppos`.
- `tier` — faixa de raridade/distância do spawn.
- `quantmin/quantmax` — faixa de quantidade interna (munição, líquido); `-1` usa
  default.

## events.xml — eventos dinâmicos

Define spawns de eventos (veículos, animais, infectados, helicrash) com `<event>`:
`nominal`, `min`, `max`, `lifetime`, `restock`, coordenadas via `<child>` e
`cfgeventspawns.xml`. Veículos vanilla e zumbis dinâmicos vêm daqui.

## cfgeconomycore.xml — o roteador

Registra as pastas/arquivos de economy do seu mod para a CE carregar. É onde você
"pluga" um `types.xml` custom do mod sem tocar o do mapa:

```xml
<ce folder="PMZ_Mod">
    <file name="PMZ_types.xml" type="types" />
    <file name="PMZ_spawnabletypes.xml" type="spawnabletypes" />
</ce>
```

## cfgspawnabletypes.xml — o que vem dentro

Define attachments, cargo e presets que a CE injeta ao criar o item (arma já com
mira/carregador, roupa com itens). Diferente do `types.xml` (quantidade/tempo), aqui
é o CONTEÚDO no momento do spawn.

## mapgrouppos e lifetime/apodrecimento

`mapgrouppos.xml` lista os pontos de spawn dentro dos prédios (por grupo/prédio),
casados com `usage`/`tier` do item. O `lifetime` também governa apodrecimento de
perecíveis: comida atravessa estágios de dano/frescor conforme o tempo e a
temperatura; ajustar `lifetime` e os parâmetros de agente (Agents/temperatura no
config do item) altera a velocidade de apodrecimento. Loot intocado que estoura o
`lifetime` é limpo pela CE para dar lugar a novos spawns respeitando `nominal`.
