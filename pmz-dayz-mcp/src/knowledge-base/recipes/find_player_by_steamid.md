# Buscar Player pelo SteamID

**Categoria:** recipe
**Versões:** 1.28, 1.29
**Tags:** player, steamid, identity, server
**Adicionado em:** 25/02/2026

---

## Código

```c
PlayerBase PMZ_GetPlayerBySteamId(string steamId)
{
    array<Man> players = new array<Man>();
    GetGame().GetWorld().GetPlayerList(players);

    foreach (Man man : players)
    {
        PlayerIdentity identity = man.GetIdentity();
        if (identity && identity.GetPlainId() == steamId)
            return PlayerBase.Cast(man);
    }
    return null;
}
```

## Onde usar
Sempre no **SERVER SIDE** (4_World ou 5_Mission lado servidor).

## Avisos importantes
- Usar `GetPlainId()` e NÃO `GetId()` — GetId() inclui prefixo
- GetPlayerList() retorna lista vazia no CLIENT SIDE
- Sempre verificar se o retorno não é null antes de usar

## Anti-pattern
```c
// ❌ ERRADO — chamar no 3_Game (client side)
PlayerBase player = PMZ_GetPlayerBySteamId("123"); // sempre null no cliente
```
