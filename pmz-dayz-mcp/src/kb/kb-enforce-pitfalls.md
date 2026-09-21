---
id: kb-enforce-pitfalls
title: Armadilhas de EnforceScript (ref/autoptr, operadores, Split)
subsystem: language
tags: [ref, autoptr, precedencia, Split, super, no-return-statement]
game_version: 1.29
last_verified: 2026-07-03
---

# Armadilhas de EnforceScript

EnforceScript parece C#/C++ mas tem regras próprias de compilação e memória. Estas
são as que mais quebram build de forma silenciosa ou enganosa.

## ref vs autoptr — nunca os dois juntos

Ambos gerenciam vida de objeto por contagem de referência. Use **um** por
declaração: `ref` para membros de classe, `autoptr` para variáveis locais. Combinar
(`ref autoptr`) ou misturar num mesmo dono gera comportamento indefinido de GC.

## Não use delete em objeto managed

Objetos sob `ref`/`autoptr` são gerenciados; `delete` manual sobre eles conflita com
o refcount. Deixe a referência sair de escopo / ser anulada. `delete` é para o que
você mesmo aloca sem gerência.

## Precedência de operadores

Bitwise/comparação têm precedência traiçoeira:

```c
if (flags & MASK == MASK)   // vira flags & (MASK == MASK) → quase sempre errado
if ((flags & MASK) == MASK) // correto: sempre parentize
```

## Operador no início de linha de continuação quebra

Quebrar expressão longa com o operador no INÍCIO da próxima linha falha o parser:

```c
// QUEBRA:
bool ok = a
        && b;
// OK:
bool ok = a &&
          b;
```

Mesma classe de problema: **ternário inline como argumento de método** pode quebrar —
extraia para uma variável antes de passar.

## Método de 1 linha com if+return → "No return statement"

Corpo de método numa linha só, com `if` seguido de `return`, faz o compilador
reclamar de "No return statement". Sempre multi-linha:

```c
// QUEBRA:
int F() { if (x) return 1; return 0; }
// OK:
int F()
{
    if (x) return 1;
    return 0;
}
```

## Split descarta tokens vazios

`string.Split` (e helpers de split) **descartam campos vazios no meio** do payload,
deslizando os índices seguintes. Se um campo pode vir vazio num payload delimitado,
ancore pelo ÚLTIMO campo ou mande uma sentinela do servidor no lugar do vazio.

## Construtor de subclasse precisa super(args) completo

O construtor da subclasse deve replicar a assinatura completa do pai e chamar
`super(args)` — sem isso a construção falha:

```c
class Filho : Pai
{
    void Filho(int a, string b) { super(a, b); /* ... */ }
}
```

## Nomes de classe são GLOBAIS entre mods

Todos os mods carregados juntos compartilham um namespace global de nomes de classe.
Uma colisão (`Helper`, `Manager`, `Config`...) entre dois mods corrompe/embaralha o
carregamento. **Prefixe tudo** (`PMZ_`) e faça grep de colisão antes de finalizar.
Corolário: um membro de classe não pode ter o nome de um tipo do engine
(`Attachments`, `Cargo`) — dá "Variable name X already used as type name"; renomeie
(lembrando que muda a chave JSON serializada).
