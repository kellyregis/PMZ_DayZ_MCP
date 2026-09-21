---
doc_id: kb-codelock
title: "CodeLock — Fechadura Digital com PIN (1.30)"
subsystem: Security / Base Building
category: new-system
tags: ["codelock", "security", "building", "rpc", "1.30"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# CodeLock (DayZ 1.30)

## Visão Geral
O CodeLock é um componente de fechadura digital introduzido na 1.30. Permite proteger portas e containers com PIN de 4-6 dígitos, incluindo proteção contra brute-force. É implementado como `CodeLockComponent extends Managed` e integrado via RPCs dedicados.

## Componente Principal
```cpp
class CodeLockComponent : Managed
{
    const int MIN_LOCK_PIN_LENGTH = 4;
    const int MAX_LOCK_PIN_LENGTH = 6;
    private const float DEFAULT_BRUTEFORCE_TIME = 30.0;
    private const float DEFAULT_BRUTEFORCE_RESET_TIME = 3600.0;
}
```

## Estados (`CodeLockStage`)
| Estado | Descrição |
|---|---|
| `NONE` | Sem codelock ou não inicializado |
| `NORMAL` | Operação normal (trancado/destrancado) |
| `SETTING` | Modo de configuração de PIN |
| `PROTECTION_STAGE_ONE` | Primeira etapa de proteção brute-force |
| `PROTECTION_STAGE_TWO` | Segunda etapa de proteção brute-force |

## Ações de UI (`CodeLockUIAction`)
| Ação | Descrição |
|---|---|
| `NONE` | Nenhuma ação |
| `CONFIRM_INPUT` | Confirmar PIN digitado |
| `CLEAR_INPUT` | Limpar entrada atual |
| `DIGIT_INPUT` | Entrada de dígito individual |

## Proteção Brute-Force
- **Timer de bloqueio:** 30 segundos (default) após exceder tentativas erradas
- **Reset timer:** 3600 segundos (1 hora) para resetar contador de falhas
- **Contador:** `m_WrongCodeCount` rastreia tentativas incorretas
- **Stages progressivos:** `PROTECTION_STAGE_ONE` → `PROTECTION_STAGE_TWO`

## RPCs Dedicados
| RPC | Direção | Descrição |
|---|---|---|
| `RPC_CODE_LOCK_REQUEST` | Client→Server | Requisição de interação |
| `RPC_CODE_LOCK_RESPONSE` | Server→Client | Resposta com estado do lock |
| `RPC_CODE_LOCK_UI_ACTION` | Bidirecional | Ação de UI (input/confirm/clear) |

## Gerenciamento Visual
- `CodeLockVisualManager` gerencia estados de luz (`CodeLockLightState`)
- Feedback visual de sucesso/falha/proteção

## Item Associado
- `CodeLock` (item base em `4_World/Entities/ItemBase/CodeLock.c`)
- Pode ser craftado/encontrado e aplicado a estruturas compatíveis

## UI
- `DigitalCodeLockUI` (5_Mission/GUI/DigitalCodeLockUI.c)
- Layout: `day_z_digital_lock.layout`
- Backup layout: `day_z_digital_lock_backup.layout`

## ⚠️ Notas para Modders

1. **PIN length fixo:** Mínimo 4, máximo 6 dígitos. Não altere estas constantes sem entender as implicações de segurança.
2. **Brute-force é server-side:** A proteção roda no servidor; o cliente recebe apenas feedback visual.
3. **Integração via RPC:** Mods devem usar os RPCs existentes (`RPC_CODE_LOCK_*`) em vez de criar canais customizados.
4. **Attachment:** O componente é anexável a entidades compatíveis. Verifique `m_Parent` e `m_DoorIndex` para associação correta.
5. **Persistência:** O estado do lock (PIN, locked/unlocked) é persistido com a entidade pai.

## Arquivos-Chave
- `4_World/Classes/CodeLockComponent.c` — Componente principal
- `4_World/Classes/CodeLockVisualManager.c` — Gerenciamento visual
- `4_World/DigitalCodeLockUIBase.c` — Base da UI
- `5_Mission/GUI/DigitalCodeLockUI.c` — Implementação da UI
- `4_World/Entities/ItemBase/CodeLock.c` — Item físico
- `4_World/Classes/UserActionsComponent/Actions/SingleUse/ActionCombinationLockUnlock.c` — Action de unlock
- `4_World/Classes/UserActionsComponent/Actions/SingleUse/ActionInteractCodeLockBase.c` — Action base
- `4_World/Classes/UserActionsComponent/Actions/SingleUse/ActionInteractCodeLockItem.c` — Action com item
- `4_World/Classes/UserActionsComponent/Actions/SingleUse/ActionResetCodeOnCodeLock..c` — Reset de código