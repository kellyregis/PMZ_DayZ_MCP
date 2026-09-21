---
id: kb-rpc
title: RPC — comunicação cliente/servidor (OnRPC, ScriptRPC)
subsystem: network
tags: [OnRPC, ScriptRPC, rpc_type, PlayerIdentity, RPCSingleParam]
game_version: 1.29
last_verified: 2026-07-03
---

# RPC — comunicação cliente/servidor

RPC (Remote Procedure Call) é o canal para trocar mensagens entre cliente e
servidor. Você envia com `RPCSingleParam`/`ScriptRPC.Send` e recebe sobrescrevendo
`OnRPC(PlayerIdentity sender, int rpc_type, ParamsReadContext ctx)`.

## Envio

```c
// Um parâmetro simples
GetGame().RPCSingleParam(target, PMZ_RPC_ABRIR_MENU, new Param1<int>(saldo), true, identity);

// Vários parâmetros via ScriptRPC
ScriptRPC rpc = new ScriptRPC();
rpc.Write(itemUID);
rpc.Write(quantidade);
rpc.Send(target, PMZ_RPC_COMPRAR, true, identity);
```

- `target` é a entidade âncora (frequentemente o player ou o objeto).
- O `bool` é o *guaranteed* (entrega confiável).
- `identity` direciona a um cliente específico (server→client). Do cliente→servidor
  passe `null` como destino que a engine roteia ao servidor.

## Recepção

```c
override void OnRPC(PlayerIdentity sender, int rpc_type, ParamsReadContext ctx)
{
    super.OnRPC(sender, rpc_type, ctx);

    if (rpc_type == PMZ_RPC_COMPRAR)
    {
        Param2<string,int> data;
        if (!ctx.Read(data)) return;
        // SEMPRE validar server-side
        if (GetGame().IsServer())
            ProcessarCompra(sender, data.param1, data.param2);
    }
}
```

Leia o `ctx` com o mesmo formato que foi escrito. Chame `super.OnRPC` para não
quebrar RPCs da engine/base.

## NUNCA confie no cliente

RPC client→server é entrada não confiável. O cliente pode mandar qualquer payload
(quantidade negativa, UID de outro player, item que não possui). Toda mutação de
estado autoritativa valida no servidor: `if (GetGame().IsServer())`, cheque posse,
distância, permissão, saldo. O cliente só *pede*; o servidor *decide*.

## rpc_type é namespace GLOBAL

Os IDs de `rpc_type` são um namespace único compartilhado entre TODOS os mods
carregados juntos. Reusar o ID de outro mod corrompe gameplay (um caso real: reuso
de faixa 74100+ matou o personagem). Convenção PMZ: cada mod reserva uma faixa
própria (ex.: Core 74000+, IsAlive 74100+, VehicleManager 75000+). **Faça grep do ID
antes de criar** e nunca hardcode número mágico repetido.

## Single vs multiplayer e roteamento em 1.29

Em singleplayer/self-host o cliente e o servidor rodam no mesmo processo — o RPC
ainda atravessa a mesma API, então mantenha os guards `IsServer()`/`IsClient()`.
Em 1.29 o roteamento de RPCs direcionados ao player pode passar por `DayZGame`
(handler central) antes de chegar à entidade; se um `OnRPC` de player "não dispara",
confira se o roteamento não está sendo interceptado nesse nível.

## Armadilhas

- `RPCSingleParam` com `Param1<string>` **corrompe strings >1KB**: chunkar em ~700
  chars com prefixo `idx/total|`.
- Resposta RPC pode chegar **antes** do menu de UI registrar — cachear no singleton
  do cliente e o menu puxa no init (ver kb-ui-layout).
- `RestCallback` inline de webhook é coletado pelo GC e o POST falha: guardar ref
  estática.
