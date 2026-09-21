# 3_Game nao tem Object nem PlayerIdentity - usar Class

**Categoria:** anti_pattern
**Versões:** 1.29
**Tags:** 3_Game, Object, PlayerIdentity, Class, compile, unknown_type
**Adicionado em:** 19/04/2026

---
# Object e PlayerIdentity indisponíveis em 3_Game

## Tipos INDISPONÍVEIS em 3_Game (gameScriptModule)
- `Object`
- `PlayerIdentity`
- `PlayerBase`
- `EntityAI`
- `CarScript`
- `Transport`
- `Man`

## Solução
Usar `Class` como tipo genérico em assinaturas de métodos no 3_Game.
Cast para tipo real nos módulos 4_World/5_Mission.

```c
// 3_Game — OK
bool DispatchRPC(Class sender, Class target, int rpc_type, ParamsReadContext ctx)

// 4_World — cast aqui
override bool OnRPC(Class sender, Class target, int rpc_type, ParamsReadContext ctx)
{
    PlayerIdentity id = PlayerIdentity.Cast(sender);
}
```

## Exceção
`modded class DayZGame` em 3_Game pode usar PlayerIdentity na assinatura de override de OnRPC porque é a assinatura vanilla. Proteger com `#ifndef WORKBENCH`.