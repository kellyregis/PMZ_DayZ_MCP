# Migração 1.28 → 1.29: Roteamento de RPCs (AddRPC removido)

**Categoria:** migration
**Versões:** 1.28, 1.29
**Tags:** rpc, migration, 1.29, scriptrpc, addrpc, missiongameplay, missionserver, dayzgame, scriptinvoker, bridge
**Adicionado em:** 29/04/2026

---
# Migração 1.28 → 1.29: Roteamento de RPCs

## Contexto

Na 1.29 o sistema `g_Game.GetRPCManager()` e `AddRPC()` foi **removido** do DayZ. Mods que usavam esse padrão precisam ser refatorados para usar `ScriptRPC` + `OnRPC()`. **Apenas substituir `AddRPC()` por `ScriptRPC` no lado do envio NÃO basta** — sem o handler de recepção, os RPCs chegam mas são silenciosamente descartados.

**Sintoma típico:** após "migração para 1.29", o mod compila e sobe sem erros, mas funcionalidades cliente↔servidor param de funcionar (ex.: tela de spawn select não abre ao morrer, botões não respondem, configs não chegam ao cliente).

## Onde os RPCs caem na 1.29

| Origem do `rpc.Send(target, ...)` | Onde a engine entrega |
|---|---|
| `target = this_object` (ex.: `rpc.Send(this, ...)`) | `Object.OnRPC()` daquele objeto (3 params: `sender, rpc_type, ctx`) |
| `target = null` | `DayZGame.OnRPC()` (4 params: `sender, target, rpc_type, ctx`) |

**❌ NÃO funciona:** tentar `override void OnRPC()` em `MissionServer`. A classe base não expõe esse método para override no servidor — gera erro de compilação:

```
Function 'OnRPC' is marked as override, but there is no function with this name in the base class
```

`MissionGameplay.OnRPC` (cliente) **compila** mas usar duas implementações desemparelhadas (uma em cada Mission) torna o código frágil. Padrão recomendado: centralizar em `DayZGame.OnRPC` e usar bridge.

## Padrão recomendado: Bridge com ScriptInvoker

Vem do PMZ_Loja (`PMZ_LojaRPCBridge` + `PMZ_LojaAdminDayZGame`). Funciona porque **3_Game não enxerga tipos definidos em 5_Mission** (Mission, MissionServer, MissionGameplay) — então o bridge usa um `ScriptInvoker` estático que 5_Mission se inscreve em runtime.

### Estrutura

```
Scripts/3_Game/
├── PMZ_<Mod>RPCBridge.c   ← ScriptInvoker estático
└── DayZGame.c             ← OnRPC override que chama .Invoke()

Scripts/5_Mission/
├── PMZ_<Mod>RPCHandler.c  ← Classe estática com lógica de dispatch
└── missionShared.c        ← MissionGameplay/MissionServer fazem .Insert() no construtor
```

### 1) Bridge em 3_Game

```c
// Scripts/3_Game/PMZ_<Mod>RPCBridge.c
class PMZ_<Mod>RPCBridge
{
    static ref ScriptInvoker OnPMZ<Mod>RPC = new ScriptInvoker();
}
```

### 2) DayZGame.OnRPC invoca o bridge

```c
// Scripts/3_Game/DayZGame.c
modded class DayZGame
{
    override void OnRPC(PlayerIdentity sender, Object target, int rpc_type, ParamsReadContext ctx)
    {
        super.OnRPC(sender, target, rpc_type, ctx);

        // Filtra apenas a faixa de IDs do seu mod (definida no enum PMZ_<Mod>ERPCs)
        if (rpc_type >= 10000 && rpc_type <= 10026)
        {
            PMZ_<Mod>RPCBridge.OnPMZ<Mod>RPC.Invoke(sender, target, rpc_type, ctx);
        }
    }
}
```

> **Importante:** filtre pela faixa de IDs do mod. Sem o filtro, **todo** RPC vanilla do DayZ passa pelo bridge — desperdício de CPU e risco de conflito.

### 3) Handler estático em 5_Mission (vê tipos de Mission)

```c
// Scripts/5_Mission/PMZ_<Mod>RPCHandler.c
class PMZ_<Mod>RPCHandler
{
    static void OnRPC(PlayerIdentity sender, Object target, int rpc_type, ParamsReadContext ctx)
    {
        if (g_Game.IsServer())
        {
            MissionServer ms = MissionServer.Cast(g_Game.GetMission());
            if (ms)
            {
                if (rpc_type == PMZ_<Mod>ERPCs.RPC_X)
                    ms.HandleX(ctx, sender, target);
                // ...
            }
            return;
        }

        if (g_Game.IsClient())
        {
            MissionGameplay mg = MissionGameplay.Cast(g_Game.GetMission());
            if (mg)
            {
                if (rpc_type == PMZ_<Mod>ERPCs.RPC_Y)
                    mg.HandleY(ctx, sender, target);
                // ...
            }
        }
    }
}
```

### 4) Mission constructors fazem Insert

```c
// Scripts/5_Mission/missionShared.c
modded class MissionGameplay
{
    void MissionGameplay()
    {
        if (g_Game.IsClient())
        {
            // Inscreve handler no bridge
            PMZ_<Mod>RPCBridge.OnPMZ<Mod>RPC.Insert(PMZ_<Mod>RPCHandler.OnRPC);
        }
    }
}

modded class MissionServer
{
    void MissionServer()
    {
        if (g_Game.IsServer())
        {
            PMZ_<Mod>RPCBridge.OnPMZ<Mod>RPC.Insert(PMZ_<Mod>RPCHandler.OnRPC);
        }
    }
}
```

## Casos especiais

### RPC para Object específico (ex.: SleepingBag, item de mundo)

Para RPCs com **target = um objeto** (`rpc.Send(this, ...)`), não precisa de bridge — basta sobrescrever `Object.OnRPC()` (3 params) na classe modded. Exemplo:

```c
class SleepingBagBase_Deployed extends ItemBase
{
    override void OnRPC(PlayerIdentity sender, int rpc_type, ParamsReadContext ctx)
    {
        super.OnRPC(sender, rpc_type, ctx);
        if (rpc_type == PMZ_<Mod>ERPCs.RPC_REQUEST_OWNER_NAME) { ... }
    }
}
```

### Membros protegidos em classes singleton

Se uma classe singleton (ex.: `zPMZRespawn` com `protected ref m_Conf`) precisa receber dados de RPC, **adicione um método `OnRPC()` público nela** e chame-o do handler estático — assim o acesso aos membros protegidos fica no escopo correto:

```c
// No handler:
zPMZRespawn.GetInst().OnRPC(sender, rpc_type, ctx);

// Na classe singleton (não é Object, então engine não chama automaticamente):
void OnRPC(PlayerIdentity sender, int rpc_type, ParamsReadContext ctx)
{
    if (rpc_type == ...) m_Conf = ... ;
}
```

## Sintaxe Enforce Script — armadilhas

- `if (a || b)` em **uma única linha**. Quebrar com `||` no fim da linha gera `Expected ')'`.
- `override` exige que a classe base tenha o método com **a mesma assinatura**. Caso contrário: `no function with this name in the base class`.
- `OnEvent(EventType, Param)` **NÃO** trata RPCs — só eventos de jogo (`ChatMessageEventTypeID`, etc.). Não confundir.

## Anti-padrões observados (corrigir se aparecerem)

1. **Remover `AddRPC()` sem adicionar `OnRPC()` correspondente** → RPCs viram lixo, mod compila mas funcionalidades silenciosas quebradas.
2. **`override void OnEvent()` com comentário "trata RPCs"** → engano: OnEvent é para `EventType` de jogo, não para `ScriptRPC`.
3. **Tentar `override OnRPC` em `MissionServer`** → erro de compilação. Use bridge via `DayZGame.OnRPC`.
4. **`OnRPC()` em classe singleton (não-Object)** sem chamada manual → método nunca executa. Engine só chama `OnRPC` em `Object` e `DayZGame`/`MissionGameplay`.
5. **Bridge sem filtro por faixa de ID** → invoca o ScriptInvoker para todo RPC do jogo.

## Referências

- Implementação canônica: `PMZ_Loja_projeto/PMZ_Loja/scripts/3_Game/PMZ_LojaRPCBridge.c` + `PMZ_LojaAdminDayZGame.c`
- Caso real corrigido: `PMZ_Respawn` (2026-04-29) — tela de spawn select não abria após morte porque `RPC_PMZ_START_SPAWN_SELECTION_FROM_SERVER` não tinha handler. Solução: bridge `PMZ_RespawnRPCBridge` + `PMZ_RespawnRPCHandler`.
