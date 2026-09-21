# Enum cross-mod: usar int literal ao invés de enum simbólico no bridge

**Categoria:** anti_pattern
**Versões:** 1.29
**Tags:** enum, cross-mod, compile-error, workbench, rpc, bridge, PMZ_Core_RPCs, PMZ_Loja_Server
**Adicionado em:** 20/04/2026

---
## Problema

Quando um **server-mod** (ex: `PMZ_Loja_Server`) referencia um enum definido em outro mod (ex: `PMZ_Core_RPCs.LOJA_HISTORY_REQUEST`), o Workbench pode falhar com:

```
Can't find variable 'LOJA_HISTORY_REQUEST'
```

Isso acontece mesmo com `requiredAddons` correto no `config.cpp`. O compilador do Workbench nem sempre propaga a recompilação do mod dependente antes de compilar o dependente — especialmente quando o enum foi **recém-adicionado** e o PBO do mod-pai ainda está com a versão antiga em cache.

## Solução

No bridge (mod que **consome** o enum de outro mod), usar o **valor int literal** com comentário indicando a origem:

```csharp
// ERRADO - pode falhar na compilação cross-mod
case PMZ_Core_RPCs.LOJA_HISTORY_REQUEST:
    break;

// CORRETO - int literal com comentário
case 74024: // PMZ_Core_RPCs.LOJA_HISTORY_REQUEST
    break;
```

Para RPCs de resposta (Send), mesmo padrão:

```csharp
// ERRADO
rpc.Send(null, PMZ_Core_RPCs.LOJA_HISTORY_RESPONSE, true, sender);

// CORRETO
rpc.Send(null, 74025 /* PMZ_Core_RPCs.LOJA_HISTORY_RESPONSE */, true, sender);
```

## Regra

- **Dentro do próprio mod** (PMZ_Core usando PMZ_Core_RPCs): usar o enum normalmente
- **Cross-mod** (PMZ_Loja_Server usando PMZ_Core_RPCs): usar int literal + comentário
- Sempre manter o comentário com o nome simbólico para rastreabilidade
- Manter o enum atualizado no mod-pai como fonte da verdade dos IDs

## Onde aplicado

- `PMZ_Loja_Server/Scripts/3_Game/PMZ_LojaCoreBridge.c` — RPCs 74024/74025 (LOJA_HISTORY_REQUEST/RESPONSE)
- Os RPCs anteriores (74020-74023) usavam `PMZ_Core_RPCs.*` e funcionavam porque já existiam no PBO compilado; novos valores adicionados ao enum sofrem o problema até o próximo rebuild completo
