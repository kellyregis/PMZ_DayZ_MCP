# Criação de Diretórios Aninhados de Uma Vez

**Categoria:** anti_pattern
**Versões:** 1.28, 1.29
**Tags:** MakeDirectory, profile, crash
**Adicionado em:** 25/02/2026

---

## Problema
DayZ NÃO cria diretórios pai automaticamente.
Tentar criar `PandoraModz/PMZ_Mod/logs` de uma vez causa falha silenciosa.

## ❌ ERRADO
```c
MakeDirectory("$profile:PandoraModz/PMZ_MeuMod/logs"); // FALHA — PandoraModz pode não existir
```

## ✅ CORRETO — Criar passo a passo
```c
void PMZ_CriarDiretorios()
{
    string pandora = "$profile:PandoraModz";
    if (!FileExist(pandora))
        MakeDirectory(pandora);

    string mod = pandora + "/PMZ_MeuMod";
    if (!FileExist(mod))
        MakeDirectory(mod);

    string logs = mod + "/logs";
    if (!FileExist(logs))
        MakeDirectory(logs);
}
```

## Regra
Um MakeDirectory por nível. Sempre verificar com FileExist antes.
