---
doc_id: kb-sandstorm
title: "Sandstorm Controller — Sistema Climático Server-Side (1.30)"
subsystem: Weather / Environment
category: new-system
tags: ["sandstorm", "weather", "server-only", "ppe", "1.30"]
game_version: "1.30"
last_verified: "2026-09-21"
---

# Sandstorm Controller (DayZ 1.30)

## Visão Geral
A Sandstorm é um fenômeno climático **server-side** introduzido na 1.30. O controle é feito exclusivamente pelo servidor e replicado para todos os clientes. Mods **NÃO DEVEM** tentar criar ou controlar a sandstorm no cliente.

## Acesso à Instância
```cpp
// Obter o controller atual (leitura client-side OK)
SandstormController storm = Weather.GetSandstorm();
```

## API Principal (proto native — server-only para escrita)

| Método | Escopo | Descrição |
|---|---|---|
| `bool Start(float duration, bool calledByWeather)` | Server | Inicia a sandstorm com fade-in de `duration` segundos |
| `void Stop(float duration, bool calledByWeather)` | Server | Para a sandstorm com fade-out de `duration` segundos |
| `bool IsActive()` | Any | Retorna true se há sandstorm ativa em qualquer lugar |
| `vector GetDirection()` | Any | Direção do movimento (start → end) |
| `vector GetPosition()` | Any | Posição atual em world space |
| `float GetSpeed()` | Any | Velocidade de avanço em m/s |
| `float GetRemainingMovementDuration()` | Any | Tempo restante até posição final |
| `bool IsPositionAtEnd()` | Any | Se alcançou a posição final |
| `vector ProjectToEdge(vector worldPosition)` | Any | Projeta posição para a borda da sandstorm |

## ⚠️ Regras Críticas para Modders

1. **SERVER-ONLY:** `Start()` e `Stop()` são chamadas server-side. Chamar no cliente não tem efeito ou causa erro.
2. **Leitura client-side:** `IsActive()`, `GetPosition()`, `GetDirection()` etc. podem ser usados no cliente para lógica visual/gameplay.
3. **Não instanciar:** O construtor é privado. Sempre use `Weather::GetSandstorm()`.
4. **Replicação automática:** O estado é replicado pelo engine; mods não precisam gerenciar sync manualmente.

## Exposição do Jogador
- **Modifier:** `SandstormExposure` (em `4_World/Classes/PlayerModifiers/Modifiers/conditions/SandstormExposure.c`)
- Rastreia tempo de exposição e aplica efeitos de saúde
- Integrado ao sistema de PlayerModifiers padrão

## Post-Process Effects (PPE)
- **Requester:** `PPERequester_SandstormEffect` (em `3_Game/PPEManager/Requesters/PPERSandstorm.c`)
- Aplica overlay visual de areia/poeira quando ativo
- Integrado ao PPEManager existente

## Dados do Jogador
- **Persistência:** `PlayerSandstormData` (em `4_World/Systems/Sandstorm/PlayerSandstormData.c`)
- Armazena estado de exposição por jogador
- **Scripted controller:** `ScriptedSandstormController` (em `4_World/Systems/Sandstorm/ScriptedSandstormController.c`)

## RPCs Relacionados
| RPC | Tipo | Uso |
|---|---|---|
| `DEV_SET_SANDSTORM` | Dev | Força início (debug) |
| `DEV_STOP_SANDSTORM` | Dev | Força parada (debug) |
| `DEV_SET_SANDSTORM_WEATHER` | Dev | Via weather system |
| `DEV_STOP_SANDSTORM_WEATHER` | Dev | Via weather system |

## Arquivos-Chave
- `3_Game/Sandstorm.c` — Controller principal (proto native)
- `4_World/Systems/Sandstorm/ScriptedSandstormController.c` — Wrapper script
- `4_World/Systems/Sandstorm/PlayerSandstormData.c` — Dados por jogador
- `4_World/Classes/PlayerModifiers/Modifiers/conditions/SandstormExposure.c` — Modifier
- `3_Game/PPEManager/Requesters/PPERSandstorm.c` — PPE requester

## Exemplo de Uso (Server-Side Mod)
```cpp
// Em um mod server-side que quer forçar sandstorm sob condição customizada
if (myCustomCondition && !Weather.GetSandstorm().IsActive())
{
    Weather.GetSandstorm().Start(300.0, false); // 5 min fade-in
}
```

## Exemplo de Uso (Client-Side Mod)
```cpp
// Em um mod client-side que reage à sandstorm
if (Weather.GetSandstorm().IsActive())
{
    float dist = vector.Distance(GetGame().GetPlayer().GetPosition(), 
                                  Weather.GetSandstorm().GetPosition());
    if (dist < 500.0)
    {
        // Aplicar lógica local (ex: reduzir visibilidade extra, som custom)
    }
}
```