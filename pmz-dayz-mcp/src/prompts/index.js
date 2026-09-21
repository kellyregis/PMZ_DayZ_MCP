// src/prompts/index.js — prompts (recipes de modding PMZ) expostos via MCP.
// Cada prompt injeta o padrão PMZ e orienta o Claude a CONSULTAR as tools dayz_*
// antes de afirmar assinatura/hierarquia (mecanismo, não achismo).
import { z } from 'zod';

const RECIPES = [
  {
    name: 'recipe_persistent_item',
    description: 'Esqueleto de item DayZ com persistência correta (OnStoreSave/Load versionado).',
    args: { class_name: z.string().describe('Nome da classe do item') },
    build: (a) => `Crie um item DayZ chamado ${a.class_name} com persistência correta.
Regras obrigatórias (mecanismo, não achismo):
1. Chame dayz_get_method{class:"ItemBase", method:"OnStoreSave"} e dayz_get_method{method:"OnStoreLoad"} para confirmar as ASSINATURAS exatas antes de escrever.
2. Consulte dayz_kb_search{query:"persistência OnStoreSave versionamento"}.
3. ctx.Write no OnStoreSave e ctx.Read no OnStoreLoad DEVEM estar na MESMA ordem.
4. No OnStoreLoad: chame super primeiro, cheque o version, retorne false em erro.
5. Cite file:line do vanilla nas decisões.`,
  },
  {
    name: 'recipe_rpc_secure',
    description: 'RPC cliente→servidor com validação server-side e PlayerIdentity.',
    args: { feature: z.string().describe('O que o RPC faz') },
    build: (a) => `Implemente um RPC seguro para: ${a.feature}.
1. Consulte dayz_kb_search{query:"RPC OnRPC validação server-side"} e dayz_get_method{method:"OnRPC"}.
2. Escolha um rpc_type ÚNICO — rpc_type é namespace global; cheque colisão. Em 1.29 confirme o roteamento (dayz_kb_search{query:"migração RPC routing 1.29"}).
3. NUNCA confie no cliente: valide tudo no servidor antes de aplicar.
4. Use PlayerIdentity do sender para autorização.`,
  },
  {
    name: 'recipe_custom_action',
    description: 'Ação custom (ActionContinuousBase) + SetActions + registro no ActionConstructor.',
    args: { action: z.string().describe('O que a ação faz') },
    build: (a) => `Crie uma ação custom para: ${a.action}.
1. Consulte dayz_kb_search{query:"action system SetActions ActionConstructor"} e dayz_list_hooks{class:"ItemBase"}.
2. Registre a ação em modded ActionConstructor.RegisterActions() + actions.Insert — senão AddAction falha silencioso.
3. Item na mão sobre target do mundo → use ActionContinuousBase (não InteractBase).
4. Se o alvo for prédio/porta, override IsLockTargetOnUse()→false.`,
  },
  {
    name: 'recipe_modded_class',
    description: 'Override seguro de classe vanilla via modded class (sem quebrar a cadeia).',
    args: { target: z.string().describe('Classe vanilla a modar') },
    build: (a) => `Crie um modded class de ${a.target}.
1. Rode dayz_get_class{name:"${a.target}"} e dayz_list_hooks{class:"${a.target}"} para ver o que existe/overridar.
2. Sempre chame super.Metodo() ao overridar, salvo intenção explícita de substituir.
3. Nomes de classe são globais entre mods PMZ — prefixe helpers e cheque colisão.
4. Consulte dayz_kb_search{query:"enforce pitfalls modded ref autoptr"}.`,
  },
];

export function registerPrompts(server) {
  for (const r of RECIPES) {
    server.registerPrompt(
      r.name,
      { description: r.description, argsSchema: r.args },
      async (args) => ({
        messages: [{ role: 'user', content: { type: 'text', text: r.build(args || {}) } }],
      })
    );
  }
}

export default { registerPrompts };
