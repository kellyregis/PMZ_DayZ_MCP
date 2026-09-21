# Migração 1.28→1.29: PlayerBase.OnRPC deixou de ser invocada

**Categoria:** migration
**Versões:** 1.28→1.29
**Tags:** rpc, OnRPC, PlayerBase, DayZGame, Man, migration, RPCSingleParam, bridge, layer-3_Game
**Adicionado em:** 29/04/2026

---

## Problema

Em 1.28, RPCs enviados via `RPCSingleParam(player, rpc_id, data, true)` chegavam em `PlayerBase.OnRPC`. Em 1.29 isso parou de funcionar — o handler nunca é chamado, e o cliente fica "aguardando dados" indefinidamente.

## Causa

Em DayZ 1.29 a engine roteia RPCs para `DayZGame.OnRPC` em vez de chamar diretamente o handler do target. A assinatura também mudou:

- 1.28: `override void OnRPC(PlayerIdentity sender, int rpc_type, ParamsReadContext ctx)` em `PlayerBase` (3 params)
- 1.29: `override void OnRPC(PlayerIdentity sender, Object target, int rpc_type, ParamsReadContext ctx)` em `DayZGame` (4 params, com `Object target`)

## Solução A — Bridge mínima (preserva código existente)

Manter o `modded class PlayerBase.OnRPC` com todos os handlers e adicionar um bridge que repassa de `DayZGame.OnRPC` para o handler do player.

### Restrições críticas de layer no DayZ 1.29

| Tipo | Layer onde está definido | Visível em |
|---|---|---|
| `DayZGame` | `3_Game` | apenas `3_Game` (em 4/5_Mission só via `GetGame()`) |
| `PlayerBase` | `4_World` | `4_World`, `5_Mission` |
| `Man` | `3_Game` | todas as layers |

Consequência:
- `modded class DayZGame` **precisa** estar em `3_Game`
- Mas em `3_Game` não dá pra fazer `PlayerBase.Cast(target)` — tipo desconhecido
- Solução: usar `Man.Cast(target)`. `Man` tem `OnRPC` herdado, e como `OnRPC` é polimórfico (`override` no PlayerBase), a chamada em runtime dispatcha para `PlayerBase.OnRPC` mesmo sendo invocada via tipo `Man`.

### Código

```c
// MeuMod/scripts/3_Game/MeuMod_DayZGame.c
modded class DayZGame
{
    override void OnRPC(PlayerIdentity sender, Object target, int rpc_type, ParamsReadContext ctx)
    {
        super.OnRPC(sender, target, rpc_type, ctx);

        // Range do mod (ajustar para os RPC IDs do seu mod)
        if (rpc_type < 91050 || rpc_type > 91093)
            return;

        Man player = Man.Cast(target);
        if (player)
            player.OnRPC(sender, rpc_type, ctx);
    }
}
```

### Config.cpp

Adicionar `gameScriptModule` (carrega antes de world e mission):

```
class defs {
    class gameScriptModule {
        value = "";
        files[] = { "MeuMod/scripts/3_Game" };
    };
    class worldScriptModule { ... };
    class missionScriptModule { ... };
};
```

## Erros de compilação possíveis

Se aparecer um destes, é violação de restrição de layer:

```
PMZ_Missions/scripts/3_Game/X.c: Unknown type 'PlayerBase'
```
→ Mover o cast para `Man.Cast`, manter arquivo em 3_Game.

```
PMZ_Missions/scripts/4_World/X.c: Unknown type 'DayZGame'
```
→ Mover arquivo para 3_Game (DayZGame não é visível como tipo em 4_World).

## Solução B — ScriptInvoker (padrão usado pela PMZ_Loja)

Mais elaborado, sem dependência de PlayerBase no bridge. Usa `ScriptInvoker` em 3_Game com subscribers em 5_Mission.

Ver `D:\Mods\PMZ_Loja_projeto\PMZ_Loja\scripts\3_Game\PMZ_LojaAdminDayZGame.c` e `PMZ_LojaRPCBridge.c` para referência completa.

## Sintomas que indicam essa migração pendente

- UI mostra "Carregando..." / "Aguardando..." e nunca atualiza
- RPCs enviados via `RPCSingleParam` parecem funcionar (sem erro de envio)
- Mas o handler em `modded class PlayerBase.OnRPC` nunca é executado
- Mod funcionava em 1.28 e parou de funcionar em 1.29

## Anti-pattern

`GetRPCManager()` foi removido em 1.29 — substituir por `RPCSingleParam` é só metade do trabalho. Se os handlers estão em `PlayerBase.OnRPC`, precisa também adicionar a bridge em `DayZGame.OnRPC` (em 3_Game, usando `Man.Cast`).
