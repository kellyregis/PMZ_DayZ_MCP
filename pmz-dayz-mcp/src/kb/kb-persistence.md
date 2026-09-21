---
id: kb-persistence
title: Persistência de dados em entidades (OnStoreSave/OnStoreLoad)
subsystem: persistence
tags: [OnStoreSave, OnStoreLoad, ctx, versionamento]
game_version: 1.29
last_verified: 2026-07-03
---

# Persistência de dados em entidades

A persistência de estado custom de uma entidade no DayZ acontece por dois hooks
sobrescritos em `ItemBase`/`EntityAI`: `OnStoreSave(ParamsWriteContext ctx)` e
`OnStoreLoad(ParamsReadContext ctx, int version)`. A engine chama esses métodos
por entidade quando o servidor grava/lê o hive. Tudo o que você escreve em
`OnStoreSave` você lê **na mesma ordem** em `OnStoreLoad`. Essa é a regra que mais
corrompe save quando violada.

## Ordem de operações

`super` primeiro no save, `super` primeiro no load. O `super.OnStoreLoad` **retorna
bool** e você DEVE respeitar esse retorno: se ele falhou, aborte antes de ler seus
campos, porque o stream já está dessincronizado.

```c
override void OnStoreSave(ParamsWriteContext ctx)
{
    super.OnStoreSave(ctx);

    ctx.Write(m_SaveVersion);   // sempre escreva um marcador de versão primeiro
    ctx.Write(m_OwnerUID);
    ctx.Write(m_Charges);
}

override bool OnStoreLoad(ParamsReadContext ctx, int version)
{
    if (!super.OnStoreLoad(ctx, version))
        return false;

    if (!ctx.Read(m_SaveVersion)) return false;
    if (!ctx.Read(m_OwnerUID))    return false;
    if (!ctx.Read(m_Charges))     return false;

    return true;
}
```

Cada `ctx.Read` retorna bool; encadeie `if (!ctx.Read(x)) return false;` para não
prosseguir sobre stream quebrado.

## Versionamento do seu save (não confundir com `version` da engine)

O parâmetro `version` é a versão do formato de save da engine. Para evoluir o SEU
layout, grave seu próprio inteiro de versão como PRIMEIRO campo e leia campos novos
condicionalmente:

```c
if (!ctx.Read(m_SaveVersion)) return false;
if (m_SaveVersion >= 2)
{
    if (!ctx.Read(m_NovoCampo)) return false; // só existe em saves v2+
}
```

Nunca remova/reordene campos antigos: adicione novos SEMPRE no fim, atrás de um
guard de versão. Se você trocar a ordem de escrita/leitura, saves antigos leem lixo
e o item some ou vira RUINED no boot.

## AfterStoreLoad

Trabalho que depende de outras entidades já carregadas (attachments, cargo, refs)
não deve rodar dentro de `OnStoreLoad` — o grafo ainda está montando. Use o hook
pós-load (`AfterStoreLoad`/`EEOnAfterLoad` conforme o tipo) para reconciliar
estado, revalidar attachments e reagendar timers. Padrão do fluxo: `OnStoreLoad`
só lê bytes; a lógica que toca o mundo espera o after.

## Pitfalls reais

- **Ler o que não escreveu** (ou vice-versa): stream desliza, corrompe todos os
  itens seguintes do mesmo store.
- **Ignorar o bool do super**: você lê seus campos sobre bytes do pai → save podre.
- **Escrever em ordem diferente do load**: campeão de "carro/base some no restart".
- `GetGame().SaveVersion()` retorna a versão de save corrente da engine — útil para
  telemetria/decisões de compat, não substitui seu próprio marcador de versão.
- Se seu campo é um array/ref, escreva o Count primeiro e itere na leitura com o
  mesmo Count.
