---
id: kb-rvmat
title: Materiais e texturas (rvmat, paa, edds)
subsystem: materials
tags: [rvmat, paa, edds, normal, specular, overbright]
game_version: 1.29
last_verified: 2026-07-03
---

# Materiais e texturas

O visual de uma superfície vem de um **rvmat** (material) que aponta para **texturas**
(`.paa` / `.edds`). O p3d referencia o rvmat por seção/seleção; o rvmat referencia os
mapas.

## Formatos

- **`.paa`** — formato de textura clássico do Enfusion (DXT comprimido). É o que
  entra na maioria dos slots de material.
- **`.edds`** — variante DDS usada pela pipeline; alguns fluxos 1.29 usam edds para
  certos mapas. Converta com as ferramentas oficiais (ImageToPAA/TexView).
- **`.rvmat`** — arquivo texto que descreve a resposta de luz da superfície e lista
  as texturas em estágios (stages).

## Convenção de sufixos das texturas

- `_co` — **diffuse/color** (albedo).
- `_nohq` — **normal map** (detalhe de relevo; "no" = normal, "hq" = high quality).
- `_smdi` — **specular** (especularidade/brilho; controla reflexo e "molhado").
- `_as` — ambient shadow/occlusion em alguns fluxos.

O rvmat aponta cada estágio para o mapa correto:

```
class Stage1 { texture="\\PMZ_Mod\\data\\cofre_nohq.paa"; ... };  // normal
class Stage2 { texture="\\PMZ_Mod\\data\\cofre_smdi.paa"; ... };  // specular
```

## Diagnóstico visual

- **Textura invisível / branca / magenta** — caminho errado no rvmat/config
  (barras, nome, pasta), textura não empacotada no pbo, ou seleção do p3d não
  atribuída ao material.
- **Objeto totalmente preto** — normal map ou specular errado/ausente, ou rvmat
  esperando um mapa que não existe; também surface sem iluminação/estágio quebrado.
- **Objeto brilhando demais / "plástico molhado"** — specular (`_smdi`) alto demais
  ou canal errado; reduza a intensidade specular no rvmat.
- **Normal "estourado" (relevo invertido)** — canal verde do normal invertido
  (convenção OpenGL vs DirectX); inverta Y.

## Overbright de ImageWidget em 1.29

Fora do material 3D, a UI tem um problema específico em 1.29: a engine **estoura
pixels muito brilhantes** de um `ImageWidget` (clipping para branco, halo). A
correção prática é **pré-escurecer** a imagem aplicando uma color multiplicativa
~0.6 no widget:

```c
m_Image.SetColor(ARGB(255, 153, 153, 153)); // ~0.6 em cada canal RGB
```

Assim os brilhos param de saturar. Aplica-se a ícones/preview renderizados na UI,
não ao material da superfície 3D.
