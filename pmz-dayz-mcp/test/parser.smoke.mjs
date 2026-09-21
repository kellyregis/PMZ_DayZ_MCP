// test/parser.smoke.mjs — golden-lite: valida o extractor em construções difíceis.
// Rode: npm run test:parser
import { parseEnscript } from '../src/parser/enscript.js';
import { parseConfig } from '../src/parser/config.js';

let pass = 0, fail = 0;
function check(name, cond, got) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.error('  ✗', name, '→ got:', JSON.stringify(got)); }
}

console.log('EnScript extractor:');

// 1. herança por extends E por ':'
{
  const r = parseEnscript(`
class Foo extends Bar {}
class Baz : Qux {}
modded class ItemBase {}
`);
  check('extends capturado', r.classes.find(c => c.name === 'Foo')?.parent === 'Bar');
  check('herança : capturada', r.classes.find(c => c.name === 'Baz')?.parent === 'Qux', r.classes);
  check('modded flag', r.classes.find(c => c.name === 'ItemBase')?.isModded === true);
}

// 2. { na mesma linha da declaração
{
  const r = parseEnscript(`class A extends B { int x; }`);
  check('brace inline: classe capturada', r.classes[0]?.name === 'A' && r.classes[0]?.parent === 'B', r.classes);
}

// 3. generics aninhados preservados
{
  const r = parseEnscript(`class C { void F(map<string, ref array<Object>> m) {} }`);
  const sig = r.classes[0]?.methods[0]?.signature || '';
  check('generic aninhado preservado', sig.includes('map<string') && sig.includes('array<Object>'), sig);
}

// 4. proto native (sem corpo, uma linha)
{
  const r = parseEnscript(`class D { proto native void G(string s); }`);
  const m = r.classes[0]?.methods[0];
  check('proto native com modifiers', m?.name === 'G' && m.modifiers.includes('proto') && m.modifiers.includes('native'), m);
}

// 5. assinatura multi-linha
{
  const r = parseEnscript(`class E {
  void H(
    int a,
    string b
  );
}`);
  const m = r.classes[0]?.methods[0];
  check('assinatura multi-linha', m?.params?.length === 2, m?.params);
}

// 6. enum + valores
{
  const r = parseEnscript(`enum Color { RED, GREEN = 5, BLUE }`);
  check('enum capturado', r.enums[0]?.name === 'Color' && r.enums[0].values.length === 3, r.enums);
}

// 7. comentário/string não confunde
{
  const r = parseEnscript(`class F { void I() { string s = "class Fake extends Nope { }"; } } // class AlsoFake`);
  check('string/comment mascarados', r.classes.length === 1 && r.classes[0].name === 'F', r.classes.map(c => c.name));
}

// 8. override
{
  const r = parseEnscript(`class G { override void OnRPC(PlayerIdentity s, int t, ParamsReadContext c) {} }`);
  const m = r.classes[0]?.methods[0];
  check('override capturado', m?.modifiers.includes('override') && m.params.length === 3, m);
}

console.log('\nConfig class-tree:');
{
  const r = parseConfig(`
class CfgWeapons {
  class Base { scope=0; mode[]={"a","b"}; };
  class AKM: Base { displayName="AKM"; recoil="r"; };
};`);
  const akm = r.classes.find(c => c.name === 'AKM');
  check('config herança :', akm?.parent === 'Base', akm);
  check('config param escalar', akm?.params.find(p => p.key === 'displayName')?.value === 'AKM', akm?.params);
  const base = r.classes.find(c => c.name === 'Base');
  const arr = base?.params.find(p => p.key === 'mode');
  check('config array', arr?.isArray && Array.isArray(arr.value) && arr.value.length === 2, arr);
  check('config root', akm?.root === 'CfgWeapons', akm?.root);
}

console.log(`\n${pass} passaram, ${fail} falharam`);
process.exit(fail ? 1 : 0);
