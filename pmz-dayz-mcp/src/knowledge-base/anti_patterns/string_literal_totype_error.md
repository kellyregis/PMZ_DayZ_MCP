# String literal .ToType() não compila em Enforce — sempre use variável

**Categoria:** anti_pattern
**Versões:** 1.28, 1.29
**Tags:** enforce, compile-error, typename, ToType, string
**Adicionado em:** 10/04/2026

---
## Erro

```
Can't compile "Game" script module!
Undefined function 'NomeDaClasse.ToType'
```

## Causa

O parser do Enforce script **NÃO aceita** chamar `.ToType()` diretamente em uma string literal. Ele interpreta o conteúdo da string como identificador de classe e tenta encontrar `NomeDaClasse.ToType()` (método estático), que não existe.

## ❌ Errado

```c
typename t = "PMZShopManager".ToType();   // erro de compilacao
typename t = "PlayerBase".ToType();       // erro de compilacao
```

## ✅ Correto

Sempre use uma **variável string intermediária**:

```c
string clsName = "PMZShopManager";
typename t = clsName.ToType();
if (t)
    Print("classe existe");
```

## Exemplos vanilla que confirmam o padrão

- `scripts/3_Game/tools/ComponentsBank.c:60` — `Component.Cast(clas_name.ToType().Spawn())` — `clas_name` é variável
- `scripts/3_Game/AmmoEffects.c:82` — `typeName = effectName.ToType()` — `effectName` é variável
- `scripts/3_Game/Entities/EntityAI.c:1053` — `typename destType = GetDestructionBehaviour().ToType()` — retorno de função (também não-literal)

## Caso de uso típico

Detecção de mod opcional sem dependência hard:

```c
static bool IsModXInstalled()
{
    string sentinel = "ModXMainClass";
    return (sentinel.ToType() != null);
}
```

## Por que isso acontece

`.ToType()` é membro de `string`, declarado em `EnString.c`. O parser do Enforce parece resolver acessos a membro em literais durante uma fase de pré-resolução que tenta interpretar o conteúdo do literal como identificador, antes de resolver o tipo do literal. Usando variável, o tipo `string` é resolvido primeiro e o método é encontrado corretamente.
