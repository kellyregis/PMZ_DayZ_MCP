# PMZ_Core ↔ PMZ_Loja Integration via Bridge Pattern (Cross-Mod RPC)

**Categoria:** recipe
**Versões:** 1.29
**Tags:** pmz_core, pmz_loja, cross-mod, rpc, admin-panel, coins, bridge-pattern, decoupling
**Adicionado em:** 10/04/2026

---
## Contexto

PMZ_Core precisa gerenciar coins de players (add/remove) através do seu painel admin, mas:
- PMZ_Loja é um **mod separado** (pode não estar instalado)
- PMZ_Core **não pode ter dependência hard** com símbolos do PMZ_Loja (não compilaria sem ele)
- Os RPCs admin existentes do PMZ_Loja (12042, 12044) já são consumidos pelo `PMZ_LojaAdminDayZGame` modded class — competição pelo `ctx` se ambos lessem

## Solução: Bridge Pattern com RPCs próprias do Core

**Princípio:** PMZ_Core define seus próprios RPC IDs (74020-74023). Um arquivo bridge fica em `PMZ_Loja_Server` (que já depende do PMZ_Core) e escuta esses IDs, chamando `PMZShopManager`/`PMZCoinSystem` diretamente. PMZ_Core fica 100% desacoplado.

### Detecção do mod (client-side)

```c
// PMZ_Core/Scripts/3_Game/PMZ_LojaIntegration.c
class PMZ_LojaIntegration
{
    private static int s_DetectionCache = -1; // -1=untested, 0=false, 1=true

    static bool IsLojaInstalled()
    {
        if (s_DetectionCache == -1)
        {
            typename t = "PMZShopManager".ToType();
            s_DetectionCache = (t != null);
        }
        return (s_DetectionCache == 1);
    }
}
```

A UI esconde o submenu "PMZ_Loja" se `IsLojaInstalled() == false`:
```c
if (m_BtnLojaAdmin && !PMZ_LojaIntegration.IsLojaInstalled())
    m_BtnLojaAdmin.Show(false);
```

### RPCs do Core (decoupled)

```c
enum PMZ_Core_RPCs
{
    LOJA_PLAYER_SEARCH = 74020,        // C→S: query string
    LOJA_PLAYER_SEARCH_RESULT = 74021, // S→C: count, [name, steamid, coins, online]*
    LOJA_COIN_OP = 74022,              // C→S: steamid, amount, opType (0=add 1=remove)
    LOJA_COIN_OP_RESULT = 74023        // S→C: success, steamid, newCoins, message
}
```

### Bridge no PMZ_Loja_Server

`PMZ_Loja_Server/Scripts/3_Game/PMZ_LojaCoreBridge.c`:
- Modded `DayZGame.OnRPC` que escuta apenas 74020 e 74022
- Pode referenciar `PMZ_Core_RPCs`, `PMZShopManager`, `PMZCoinSystem` livremente (depende dos dois mods)
- Valida permissão `loja.manage` via `PMZ_Admins.Get().HasPermission(...)`
- Chama `PMZShopManager.AddCoinsToPlayer/RemoveCoinsFromPlayer` diretamente
- Responde ao client via `PMZ_Core_RPCs.LOJA_COIN_OP_RESULT`

### Client UI consumindo respostas

PMZ_Core handler em `pmz_corerpchandler.c` adiciona cases para os 2 result RPCs (74021, 74023), armazena dados em `PMZ_LojaIntegration` (estilo `PMZ_LoadoutListRPC`), e a UI no `Update()` faz polling com `s_HasNewPlayerList`/`HasNewOpResult()`.

## Por que NÃO usar GameScript.CallFunction reflection

`GameScript.CallFunction` funciona para métodos de instância, mas `PMZCoinSystem.AddPlayerCoins` é STATIC. Não há forma limpa de chamar static via reflection no Enforce. O bridge pattern é mais robusto e debuggable.

## Por que NÃO reusar os RPCs 12042/12044 do PMZ_Loja

O `PMZ_LojaAdminDayZGame` (modded class do Loja) já consome esses IDs e lê o `ctx`. Se o Core também tentasse ler o mesmo `ctx`, o segundo reader receberia stream consumido. Usar IDs próprios elimina o problema.

## Anti-pattern relacionado

❌ **NÃO** referencie classes de PMZ_Loja diretamente no PMZ_Core — quebra compilação quando Loja ausente.
❌ **NÃO** faça PMZ_Core depender de PMZ_Loja em config.cpp — Core deve ser standalone.
✅ Bridge patterns + RPCs com IDs próprios do mod requisitante.
