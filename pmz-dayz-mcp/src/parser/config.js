// src/parser/config.js
// Parser class-tree para config.cpp derapificado (ADR-04 do plano).
// Gramática: class Nome [: Pai] { key=val; key[]={...}; class Sub {...}; };
// Resolve herança na consulta (flatten) — aqui só extraímos a árvore crua.

// Pré-processa #define simples (substituição textual token→valor). config.cpp
// derapificado normalmente não tem macros, mas tratamos defensivamente.
function preprocessDefines(src) {
  const defines = new Map();
  const lines = src.split('\n');
  const kept = [];
  for (const ln of lines) {
    const m = ln.match(/^\s*#define\s+(\w+)(?:\s+(.*))?$/);
    if (m) { defines.set(m[1], (m[2] || '').trim()); continue; }
    if (/^\s*#(include|ifdef|ifndef|else|endif|undef|if)\b/.test(ln)) { kept.push(''); continue; }
    kept.push(ln);
  }
  let out = kept.join('\n');
  if (defines.size) {
    // substitui macros por palavra inteira (mais longas primeiro)
    const keys = [...defines.keys()].sort((a, b) => b.length - a.length);
    for (const k of keys) {
      out = out.replace(new RegExp('\\b' + k + '\\b', 'g'), defines.get(k));
    }
  }
  return out;
}

// Tokenizer de config: mantém CONTEÚDO das strings (diferente do EnScript, aqui
// os valores importam).
function tokenizeConfig(src) {
  const tokens = [];
  const n = src.length;
  let i = 0, line = 1;
  while (i < n) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; } i += 2; continue;
    }
    if (c === '"') {
      const startLine = line; let s = ''; i++;
      while (i < n && src[i] !== '"') {
        if (src[i] === '\n') line++;
        if (src[i] === '\\' && i + 1 < n) { s += src[i + 1]; i += 2; continue; }
        s += src[i]; i++;
      }
      i++; // fecha "
      tokens.push({ t: 'str', v: s, line: startLine });
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = i; while (i < n && /[A-Za-z0-9_]/.test(src[i])) i++;
      tokens.push({ t: 'id', v: src.slice(start, i), line });
      continue;
    }
    if (/[0-9.\-+]/.test(c) && /[0-9.]/.test(c === '-' || c === '+' ? (src[i + 1] || '') : c)) {
      const start = i; i++;
      while (i < n && /[0-9a-fA-FxXeE.\-+]/.test(src[i])) i++;
      tokens.push({ t: 'num', v: src.slice(start, i), line });
      continue;
    }
    // pontuação
    tokens.push({ t: 'punct', v: c, line }); i++;
  }
  return tokens;
}

export function parseConfig(source, filePath = '') {
  const result = { filePath, classes: [], parseQuality: 'ok' };
  let tokens;
  try {
    tokens = tokenizeConfig(preprocessDefines(source));
  } catch (e) {
    result.parseQuality = 'failed';
    return result;
  }
  const N = tokens.length;
  let p = 0;
  const peek = (k = 0) => tokens[p + k];
  const isP = (tk, v) => tk && tk.t === 'punct' && tk.v === v;
  const isId = (tk, v) => tk && tk.t === 'id' && (v === undefined || tk.v === v);

  // Lê um valor de array balanceando { }. Retorna array JS.
  function readArray() {
    // peek === '{'
    p++;
    const arr = [];
    while (p < N && !isP(peek(), '}')) {
      const tk = peek();
      if (isP(tk, '{')) { arr.push(readArray()); continue; }
      if (isP(tk, ',')) { p++; continue; }
      if (tk.t === 'str') { arr.push(tk.v); p++; continue; }
      if (tk.t === 'num') { arr.push(numOrStr(tk.v)); p++; continue; }
      if (tk.t === 'id') { arr.push(tk.v); p++; continue; }
      p++;
    }
    if (isP(peek(), '}')) p++;
    return arr;
  }

  // Lê valor escalar até ';'
  function readScalar() {
    const parts = [];
    while (p < N && !isP(peek(), ';')) {
      const tk = peek();
      if (tk.t === 'str') parts.push({ kind: 'str', v: tk.v });
      else if (tk.t === 'num') parts.push({ kind: 'num', v: tk.v });
      else if (tk.t === 'id') parts.push({ kind: 'id', v: tk.v });
      p++;
    }
    if (isP(peek(), ';')) p++;
    if (parts.length === 0) return '';
    if (parts.length === 1) {
      const one = parts[0];
      return one.kind === 'num' ? numOrStr(one.v) : one.v;
    }
    return parts.map(x => x.v).join(' ');
  }

  // Parseia o corpo de uma classe (entre { }). rootName = Cfg* de topo.
  function parseBody(rootName, parentClassName) {
    // peek === '{'
    p++;
    while (p < N) {
      const tk = peek();
      if (isP(tk, '}')) { p++; return; }
      if (isP(tk, ';')) { p++; continue; }
      if (isId(tk, 'class')) { parseClass(rootName); continue; }
      if (isId(tk, 'delete') || isId(tk, 'enum')) { skipToSemiOrBlock(); continue; }
      // param: id ( [] )? = valor
      if (tk.t === 'id') {
        const key = tk.v; p++;
        let isArray = false;
        if (isP(peek(), '[') && isP(peek(1), ']')) { isArray = true; p += 2; }
        if (isP(peek(), '=')) {
          p++;
          if (isArray || isP(peek(), '{')) {
            // pode ser array literal
            if (isP(peek(), '{')) {
              const arr = readArray();
              pushParam(rootName, parentClassName, key, arr, true);
              if (isP(peek(), ';')) p++;
            } else {
              const val = readScalar();
              pushParam(rootName, parentClassName, key, val, true);
            }
          } else {
            const val = readScalar();
            pushParam(rootName, parentClassName, key, val, false);
          }
          continue;
        }
        // 'id' sem '=' → pula até ;
        skipToSemiOrBlock();
        continue;
      }
      p++;
    }
  }

  function pushParam(rootName, className, key, value, isArray) {
    const cls = currentClassIndex.get(rootName + '\0' + className);
    if (!cls) return;
    cls.params.push({ key, value, isArray });
  }

  const currentClassIndex = new Map(); // rootName\0name -> class obj

  function parseClass(rootNameCtx) {
    const line = peek().line;
    p++; // class
    if (!isId(peek())) { skipToSemiOrBlock(); return; }
    const name = peek().v; p++;
    let parent = null;
    if (isP(peek(), ':')) { p++; if (isId(peek())) { parent = peek().v; p++; } }
    else if (isId(peek(), 'extends')) { p++; if (isId(peek())) { parent = peek().v; p++; } }
    // root: se estamos no topo (rootNameCtx null), este vira o root
    const root = rootNameCtx || name;
    const cls = { root, name, parent, line, params: [] };
    result.classes.push(cls);
    currentClassIndex.set(root + '\0' + name, cls);
    // corpo ou forward
    if (isP(peek(), '{')) {
      parseBody(root, name);
      if (isP(peek(), ';')) p++;
    } else {
      if (isP(peek(), ';')) p++;
    }
  }

  function skipToSemiOrBlock() {
    while (p < N) {
      const tk = peek();
      if (isP(tk, ';')) { p++; return; }
      if (isP(tk, '{')) { let d = 0; while (p < N) { const t2 = peek(); if (isP(t2, '{')) d++; if (isP(t2, '}')) { d--; if (d === 0) { p++; break; } } p++; } if (isP(peek(), ';')) p++; return; }
      p++;
    }
  }

  // loop topo
  while (p < N) {
    const tk = peek();
    if (isId(tk, 'class')) { parseClass(null); continue; }
    p++;
  }
  return result;
}

function numOrStr(v) {
  const f = Number(v);
  return Number.isFinite(f) ? f : v;
}

export default { parseConfig };
