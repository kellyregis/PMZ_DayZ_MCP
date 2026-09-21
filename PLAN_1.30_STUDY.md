# Plano de Estudo e Integração — DayZ 1.30 no PMZ DayZ MCP

> **Objetivo:** estudar a versão 1.30 (experimental) do DayZ, documentar todas as mudanças de API/sistemas em relação à 1.29, e integrar o conhecimento no MCP existente para que o Claude desenvolva mods compatíveis com 1.30 desde o experimental.
>
> **Base:** `Cliente_130/dta/scripts` (3.042 arquivos .c) vs `1.29/scripts` (2.805 arquivos .c)
> **Autor/Marca:** PandoraModz (PMZ) · pandoramodz.com.br
> **Data:** 2026-09-21 · **Status:** Planejamento

---

## 1. Resumo Executivo do Delta 1.29 → 1.30

| Métrica | Valor | Impacto no MCP |
|---|---|---|
| Arquivos .c novos | **238** | Novos símbolos, classes, enums a indexar |
| Arquivos .c modificados | **615** | Assinaturas/herança alteradas; diff crítico |
| Arquivos .c removidos | **1** (`MissionBenchmark.c`) | Depreciação; marcar como removido no índice |
| Layouts .layout novos | **13** | Novas UIs: CodeLock, Sandstorm PPE, Underground Editor, HUD Motorbike |
| Layouts .layout totais | 214 → 227 (+6%) | Parser de layout precisa cobrir novos widgets |
| Novos RPCs | **7** | `RPC_BUNKERBROADCAST_CONFIG_SYNC`, `RPC_CODE_LOCK_*` (3), `RPC_ITEM_SOUND_*` (2), `RPC_SYMPTOM_PARAM_SYNC` |
| Novos Enums | **3+** | `EDiagMenuGame`, `ELiquidSourceObjectType`, `EVehicleVFXTypes`, `CodeLockStage`, `CodeLockUIAction`, `MotorbikeSoundCtrl` |

### 1.1 Novos Sistemas Críticos (requerem KB dedicada)

| Sistema | Arquivos-chave | Descrição | Prioridade KB |
|---|---|---|---|
| **Sandstorm** | `3_Game/Sandstorm.c`, `4_World/Systems/Sandstorm/*`, `3_Game/PPEManager/Requesters/PPERSandstorm.c` | Fenômeno climático server-side com replicação. Controller via `Weather::GetSandstorm()`. Start/Stop/IsActive/GetPosition/GetSpeed. Exposição do jogador (`SandstormExposure` modifier). | 🔴 Alta |
| **Construction / Rebuilding** | `3_Game/Systems/Construction_Basic.c`, `4_World/Classes/BaseBuilding/*`, `4_World/Classes/Rebuilding/*` | Sistema de construção reconstruído. `ConstructionBasic` → `ConstructionBase` → `Rebuilding`. Persistência própria (`HandleStoreSave/Load`). Parts tipadas (`ConstructionPartTyped`, `RebuildTyped`, etc.). Decay configurável. | 🔴 Alta |
| **Motorbike** | `3_Game/Vehicles/Motorbike.c`, `4_World/Entities/Vehicles/InheritedMotorbikes/*`, Actions de reparo/horn/pickup | Novo tipo de veículo (`Motorbike extends Transport`). Física nativa. Sound controllers (`MotorbikeSoundCtrl`). Fluids (`MotorbikeFluid`). Ações específicas (reparar chassis/engine/part, horn, animate seat, pickup). | 🟡 Média |
| **CodeLock** | `4_World/Classes/CodeLockComponent.c`, `4_World/DigitalCodeLockUIBase.c`, `5_Mission/GUI/DigitalCodeLockUI.c` | Componente de fechadura digital. PIN 4-6 dígitos. Brute-force protection (timer + wrong code count). States: NONE/NORMAL/SETTING/PROTECTION_STAGE_ONE/TWO. 3 RPCs dedicados. | 🟡 Média |
| **Bunker Broadcast** | `3_Game/CfgBunkerBroadcastHandler.c`, `4_World/Classes/BunkerBroadcast*.c` | Sistema de broadcast de bunkers. Scheduler com persistência (`$mission:BunkerBroadcastPersistenceStorage.bin`). Config sync via RPC. | 🟢 Baixa |
| **Underground Triggers** | `4_World/Plugins/PluginBase/PluginUndergroundTriggerManager.c`, `5_Mission/GUI/UndergroundTriggerEditorMenu.c` | Gerenciamento de triggers subterrâneos. Editor menu dedicado. OilPitArea/Trigger. | 🟢 Baixa |
| **Novos Sintomas/Doenças** | `Silicosis`, `HeatStroke`, `IrritatedEyes`, `FaintState`, `SquintState` | Novos modifiers e transmission agents. `RPC_SYMPTOM_PARAM_SYNC` para sincronização. | 🟡 Média |
| **Vehicle Lights/VFX/Horn** | `VehicleLightsComponent.c`, `VehicleVFXComponent.c`, `VehicleHornComponent.c`, profiles por veículo | Componentes extraídos/refatorados. Profiles específicos por modelo. `EVehicleVFXTypes` enum. | 🟢 Baixa |

### 1.2 Mudanças em APIs Centrais (modificadas, não novas)

Arquivos críticos que mudaram e afetam mods existentes:

| Arquivo | Tipo de mudança esperada | Risco para mods |
|---|---|---|
| `1_Core/constants.c` | Constantes globais adicionadas/alteradas | 🟡 Médio |
| `1_Core/proto/EnScript.c`, `EnWorld.c`, `EnMath3D.c` | Proto natives novos ou alterados | 🔴 Alto |
| `3_Game/DayZGame.c`, `Game.c`, `World.c` | Core game loop / world management | 🔴 Alto |
| `3_Game/Entities/EntityAI.c`, `Man.c`, `PlayerBase` (se modificado) | Base entities — todo mod herda daqui | 🔴 Alto |
| `3_Game/Systems/Inventory/*` (6 arquivos) | Inventário refatorado/estendido | 🔴 Alto |
| `3_Game/DamageSystem.c` | Damage zones / health system | 🟡 Médio |
| `3_Game/CE/CentralEconomy.c` | CE changes | 🟡 Médio |
| `3_Game/Enums/ERPCs.c` | 7 novos RPCs | 🟡 Médio |
| `3_Game/Enums/EActions.c` | Novas ações (verificar) | 🟡 Médio |
| `3_Game/PPEManager/*` (múltiplos) | Post-process effects expandido | 🟢 Baixo |
| `3_Game/Vehicles/Boat.c` | Veículos base alterados | 🟡 Médio |
| `4_World/Classes/PlayerModifiers/*` | Modifiers novos (Sandstorm, Heat, Silicosis) | 🟡 Médio |

---

## 2. Estratégia de Integração no MCP

### 2.1 Princípios

1. **Não quebrar o que funciona:** o índice 1.29 permanece intacto como snapshot. A 1.30 é uma nova snapshot paralela.
2. **Diff como cidadão de primeira classe:** `dayz_api_diff{from:"1.29", to:"1.30"}` deve ser a primeira tool consultada ao migrar mods.
3. **KB antes do código:** cada novo sistema recebe um doc curado ANTES de depender apenas do índice de símbolos.
4. **Incremental real:** usar hash SHA1 por arquivo para reindexar apenas os 615 modificados + 238 novos.

### 2.2 Adaptações necessárias no MCP atual

| Componente | Estado atual (1.29) | Adaptação para 1.30 | Esforço |
|---|---|---|---|
| **Schema SQLite** | `game_version TEXT` já suporta múltiplas versões | Sem mudança estrutural; adicionar snapshot `1.30` | 🟢 Mínimo |
| **Parser EnScript** | tree-sitter-enforce (gramática 1.29) | Validar contra novos constructs 1.30; atualizar grammar se necessário | 🟡 Médio |
| **Pipeline de ingestão** | CLI `pmz-dayz-mcp index --version 1.29` | Adicionar `--version 1.30`; apontar para `Cliente_130/dta/scripts` | 🟢 Mínimo |
| **Tool `dayz_api_diff`** | Implementada para 1.28→1.29 | Estender para 1.29→1.30; testar com os 238 novos + 615 modificados | 🟡 Médio |
| **Knowledge Base** | 12 docs (§4.4 do plano original) | Adicionar 4-6 novos docs (Sandstorm, Construction, Motorbike, CodeLock, Symptoms) | 🟡 Médio |
| **Layout parser** | Cobre layouts 1.29 | Indexar 13 novos layouts; validar parser contra novos widgets | 🟢 Baixo |
| **Config parser** | Cobre configs 1.29 | Verificar se há config.cpp novo na 1.30 (não encontrado no scan inicial) | 🟢 Baixo |

---

## 3. Fases de Execução

### Fase S0 — Preparação do Ambiente de Estudo (0.5 dia)

**Objetivo:** ter a 1.30 acessível e comparável sem poluir o índice 1.29.

| Passo | Ação | Entregável |
|---|---|---|
| S0.1 | Copiar `Cliente_130/dta/scripts` para estrutura padronizada `scripts_130/` (ou symlink) dentro do workspace do MCP | Scripts 1.30 em path canônico |
| S0.2 | Criar snapshot SQLite vazio `data/dayz-1.30.db` com schema §5 | DB pronto para ingestão |
| S0.3 | Validar que o parser tree-sitter atual parseia ≥95% dos 3.042 arquivos 1.30 sem erro fatal | Relatório de parse quality preliminar |
| S0.4 | Gerar lista completa de diffs (novos/removidos/modificados) em formato máquina (`/tmp/new_130.txt`, `/tmp/removed_130.txt`, `/tmp/modified_by_size.txt` já existem) | Listas validadas e versionadas |

**Aceite:** `dayz_index_status{version:"1.30"}` responde (mesmo que vazio); parser roda sem crash nos arquivos 1.30.

### Fase S1 — Ingestão e Indexação da 1.30 (1 dia)

**Objetivo:** índice 1.30 completo e funcional.

| Passo | Ação | Entregável |
|---|---|---|
| S1.1 | Rodar `pmz-dayz-mcp index --scripts scripts_130 --version 1.30 --db data/dayz-1.30.db` | Índice populado |
| S1.2 | Verificar `parse_quality`: meta ≥98% `ok`; listar `degraded/failed` | Relatório de cobertura |
| S1.3 | Validar símbolos-chave: `SandstormController`, `ConstructionBasic`, `Rebuilding`, `Motorbike`, `CodeLockComponent`, `BunkerBroadcastHandler` | Cada um retorna cadeia de herança + métodos corretos |
| S1.4 | Rodar `dayz_api_diff{from:"1.29", to:"1.30"}` e validar output contra listas manuais | Diff coerente com evidência coletada |
| S1.5 | Indexar 13 novos layouts no parser de GUI | Layouts disponíveis via tools |

**Aceite:** ≥98% dos 3.042 arquivos com `parse_quality='ok'`; `dayz_get_class{name:"SandstormController", version:"1.30"}` retorna métodos proto native corretos; diff 1.29→1.30 lista 238 added, 1 removed, 615 changed.

### Fase S2 — Knowledge Base 1.30 (1-2 dias)

**Objetivo:** docs curados para os novos sistemas, seguindo o padrão §4.4 do plano original.

| Doc ID | Subsistema | Conteúdo mínimo | Fonte primária |
|---|---|---|---|
| `kb-sandstorm` | Clima/Sandstorm | Lifecycle (Start/Stop/IsActive), server-only replication, `Weather::GetSandstorm()`, exposição do jogador, PPE requester, timers | `Sandstorm.c`, `PPERSandstorm.c`, `SandstormExposure.c` |
| `kb-construction-rebuilding` | Base Building | `ConstructionBasic` → `ConstructionBase` → `Rebuilding` hierarchy, parts tipadas, persistência (`HandleStoreSave/Load`), decay, actions de build/dismantle/destroy | `Construction_Basic.c`, `Rebuilding.c`, `ConstructionPartTyped.c` |
| `kb-motorbike` | Veículos | `Motorbike extends Transport`, sound controllers, fluids, actions específicas, repair workflow, horn, seat animation | `Motorbike.c`, `MotorbikeScript.c`, Actions |
| `kb-codelock` | Segurança/Building | `CodeLockComponent`, states (NONE/NORMAL/SETTING/PROTECTION), PIN length, brute-force protection, RPCs, UI integration | `CodeLockComponent.c`, `DigitalCodeLockUI.c` |
| `kb-symptoms-130` | Player/Saúde | Novos sintomas (Silicosis, HeatStroke, IrritatedEyes, Faint, Squint), transmission agents, `RPC_SYMPTOM_PARAM_SYNC` | Modifiers/, Symptoms/, TransmissionAgents/ |
| `kb-api-changes-130` | Migração | Resumo de breaking changes, APIs deprecated, novos RPCs, novos enums, arquivos removidos | Diff consolidado |

**Aceite:** `dayz_kb_search{query:"sandstorm", version:"1.30"}` retorna `kb-sandstorm`; cada doc tem `game_version: "1.30"` e `last_verified: "2026-09-21"`.

### Fase S3 — Validação Cruzada e Hardening (0.5-1 dia)

**Objetivo:** garantir que o índice 1.30 é confiável e que mods 1.29 não quebram silenciosamente.

| Passo | Ação | Entregável |
|---|---|---|
| S3.1 | Cross-check de assinaturas-chave contra dayzexplorer / enforce-script-lsp (se disponível para 1.30) | Tabela de validação |
| S3.2 | Testar recipes existentes (`recipe_persistent_item`, `recipe_rpc_secure`) contra API 1.30 | Relatório de compatibilidade |
| S3.3 | Adicionar golden tests para novos constructs (SandstormController proto native, ConstructionPartTyped generics, MotorbikeSoundCtrl enum) | Testes verdes |
| S3.4 | Atualizar `AUDIT_MCP_ATUAL.md` com status 1.30 | Documento atualizado |
| S3.5 | Gerar changelog renderizado `dayz://changelog/1.29-1.30` como MCP Resource | Resource acessível |

**Aceite:** Suíte de testes verde; changelog 1.29→1.30 acessível via `dayz://changelog/1.29-1.30`; pelo menos 3 mods PMZ existentes validados contra 1.30 sem breaking change não documentado.

### Fase S4 — Publicação e Comunicação (0.5 dia)

| Passo | Ação |
|---|---|
| S4.1 | Commit do índice 1.30 + novos docs KB + changelog |
| S4.2 | Push para `origin/main` (Coolify faz deploy automático) |
| S4.3 | Atualizar skill `dev-129-dayz` → renomear/estender para `dev-dayz` com suporte multi-versão |
| S4.4 | Comunicar ao time PMZ: "MCP 1.30 disponível, consultar `dayz_api_diff` antes de migrar mods" |

---

## 4. Riscos Específicos da 1.30

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Gramática tree-sitter não cobre novos constructs 1.30 | Média | Parse degraded em arquivos críticos | Fallback tokenizer + flag `parse_quality='degraded'`; contribuir upstream se necessário |
| API de Construction mudou radicalmente (breaking change) | Alta | Mods de building quebram | Doc `kb-construction-rebuilding` com migration guide; diff detalhado das classes afetadas |
| Sandstorm é server-only e mods tentam usar client-side | Alta | Bugs silenciosos em MP | Doc `kb-sandstorm` com aviso explícito "SERVER-ONLY"; hook de validação na recipe |
| 1.30 experimental muda antes do release oficial | Certa | Retrabalho de índice/docs | Versionar docs com `last_verified`; pipeline incremental permite reindex rápido |
| Configs derapificados 1.30 ainda não disponíveis | Média | Config resolution incompleta | Marcar config como pendente; focar primeiro em scripts + KB |

---

## 5. Critérios de "Pronto" para 1.30

- [ ] Índice 1.30 completo: ≥98% dos 3.042 arquivos com `parse_quality='ok'`
- [ ] `dayz_api_diff{from:"1.29", to:"1.30"}` funcional e preciso
- [ ] 6 novos docs KB curados e indexados
- [ ] 13 novos layouts indexados
- [ ] Golden tests para novos constructs passando
- [ ] Changelog 1.29→1.30 acessível via MCP Resource
- [ ] Índice publicado no Coolify via push para `origin/main`
- [ ] Skill atualizada para suportar multi-versão
- [ ] Pelo menos 3 mods PMZ validados contra 1.30

---

## 6. Referência Rápida: Números do Delta

```
Total .c 1.30:     3.042
Total .c 1.29:     2.805
Delta:             +237 líquidos

Novos:             238
Removidos:           1
Modificados:       615 (por tamanho; pode variar com hash)
Inalterados:     ~2.189

Por módulo (1.30):
  1_Core:       45 (=)
  2_GameLib:    13 (=)
  3_Game:      440 (+25 vs 415)
  4_World:   2.317 (+202 vs 2.115)
  5_Mission:   219 (+10 vs 209)

Layouts:         227 (+13 vs 214)
Novos RPCs:        7
Novos Enums:      3+
```

---

*Documento gerado em 2026-09-21 com base em análise automatizada dos scripts vanilla DayZ 1.30 (experimental) vs 1.29.*