// src/parser/enscript.js
// Declaration extractor para EnScript (.c) — substitui o parser regex antigo.
//
// Estratégia (ADR-03 do plano, caminho "declaration extractor"):
//   1. Máscara: comentários e strings viram espaços (preservando \n e offsets) →
//      o scanner nunca confunde `{`, `class`, `<` dentro de string/comentário.
//   2. Tokenização consciente de posição (linha).
//   3. Parser de nível de declaração: captura headers de classe (extends E `:`),
//      membros, métodos (multi-linha, proto native, generics preservados), enums,
//      typedefs, const globais e funções globais. NÃO avalia corpos de expressão.
//
// Objetivo: precisão de DECLARAÇÃO ≥98%. O que não parsear vira parse_quality
// 'degraded' — nunca inventa assinatura.

const KEYWORD_MODIFIERS = new Set([
  'override', 'static', 'private', 'protected', 'proto', 'native',
  'const', 'ref', 'autoptr', 'out', 'inout', 'notnull', 'local', 'volatile',
  'sealed', 'external', 'event',
]);

// ─── 1. MÁSCARA de comentários e strings ────────────────────────────────────
// Substitui conteúdo de // /* */ "" '' por espaços, mantendo \n e comprimento.
function maskCommentsAndStrings(src) {
  const out = new Array(src.length);
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';
    if (c === '/' && c2 === '/') {
      while (i < n && src[i] !== '\n') { out[i] = ' '; i++; }
      continue;
    }
    if (c === '/' && c2 === '*') {
      out[i] = ' '; out[i + 1] = ' '; i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) {
        out[i] = src[i] === '\n' ? '\n' : ' '; i++;
      }
      if (i < n) { out[i] = ' '; out[i + 1] = ' '; i += 2; }
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out[i] = ' '; i++;
      while (i < n && src[i] !== quote) {
        if (src[i] === '\\' && i + 1 < n) { out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
        out[i] = src[i] === '\n' ? '\n' : ' '; i++;
      }
      if (i < n) { out[i] = ' '; i++; }
      continue;
    }
    out[i] = c; i++;
  }
  return out.join('');
}

// ─── 2. TOKENIZAÇÃO ─────────────────────────────────────────────────────────
// Tokens: {t:'id'|'punct', v, line}. Preprocessador (#...) vira token 'pp'
// carregando a linha inteira (para #ifdef metadado, se necessário).
const PUNCT = new Set(['{', '}', '(', ')', '[', ']', '<', '>', ';', ',', ':', '=', '&', '|', '.', '*', '/', '+', '-', '!', '?', '~', '%', '^']);

function tokenize(masked) {
  const tokens = [];
  const n = masked.length;
  let i = 0, line = 1;
  while (i < n) {
    const c = masked[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
    if (c === '#') { // linha de preprocessador
      const start = i;
      while (i < n && masked[i] !== '\n') i++;
      tokens.push({ t: 'pp', v: masked.slice(start, i).trim(), line });
      continue;
    }
    // identificador / palavra-chave / número (agrupa alfanum + _)
    if (/[A-Za-z_]/.test(c)) {
      const start = i;
      while (i < n && /[A-Za-z0-9_]/.test(masked[i])) i++;
      tokens.push({ t: 'id', v: masked.slice(start, i), line });
      continue;
    }
    if (/[0-9]/.test(c)) {
      const start = i;
      while (i < n && /[0-9a-fA-FxX.]/.test(masked[i])) i++;
      tokens.push({ t: 'num', v: masked.slice(start, i), line });
      continue;
    }
    if (PUNCT.has(c)) { tokens.push({ t: 'punct', v: c, line }); i++; continue; }
    i++; // caractere desconhecido: ignora
  }
  return tokens;
}

// ─── 3. PARSER de declarações ───────────────────────────────────────────────

export function parseEnscript(source, filePath = '') {
  const result = {
    filePath,
    classes: [],      // {name,parent,isModded,line,lineEnd,members:[],methods:[],owner}
    enums: [],        // {name,line,lineEnd,values:[{name,line}]}
    typedefs: [],     // {name,aliasOf,line}
    consts: [],       // {name,type,line}
    functions: [],    // funções globais {name,returnType,params,signature,modifiers,line}
    refs: [],         // {name,line,kind}
    parseQuality: 'ok',
  };

  let masked, tokens;
  try {
    masked = maskCommentsAndStrings(source);
    tokens = tokenize(masked);
  } catch (e) {
    result.parseQuality = 'failed';
    return result;
  }

  const N = tokens.length;
  let p = 0;
  const peek = (k = 0) => tokens[p + k];
  const isPunct = (tok, v) => tok && tok.t === 'punct' && tok.v === v;
  const isId = (tok, v) => tok && tok.t === 'id' && (v === undefined || tok.v === v);

  // Lê um tipo a partir de p, preservando generics e ownership. Retorna
  // {type, owns, isConst, out} e avança p. Não consome o nome que vem depois.
  function readType() {
    let owns = false, isConst = false, out = false;
    // prefixos de ownership/modificador antes do tipo
    while (isId(peek())) {
      const v = peek().v;
      if (v === 'ref' || v === 'autoptr') { owns = true; p++; continue; }
      if (v === 'const') { isConst = true; p++; continue; }
      if (v === 'out' || v === 'inout') { out = true; p++; continue; }
      if (v === 'notnull' || v === 'local' || v === 'volatile') { p++; continue; }
      break;
    }
    if (!isId(peek())) return null;
    let type = peek().v; p++;
    // generics <...> balanceado
    if (isPunct(peek(), '<')) {
      let depth = 0, buf = '';
      while (p < N) {
        const tk = peek();
        if (isPunct(tk, '<')) depth++;
        buf += (tk.t === 'id' || tk.t === 'num' ? tk.v : tk.v);
        p++;
        if (isPunct(tk, '>')) { depth--; if (depth === 0) break; }
      }
      type += normalizeGenerics(buf);
    }
    return { type, owns, isConst, out };
  }

  // Reconstrói a string de params a partir de tokens dentro de (...).
  // Retorna {params:[{type,name,default,owns,out}], raw}
  function readParams() {
    // assume peek() === '('
    p++; // consome (
    const params = [];
    let raw = '';
    let depth = 1;
    // Captura tokens crus para 'raw' e também parseia por vírgula em depth 1.
    let current = [];
    const flush = () => {
      if (current.length === 0) return;
      params.push(parseOneParam(current));
      current = [];
    };
    while (p < N && depth > 0) {
      const tk = peek();
      if (isPunct(tk, '(') || isPunct(tk, '<') || isPunct(tk, '[')) depth++;
      else if (isPunct(tk, ')') || isPunct(tk, '>') || isPunct(tk, ']')) {
        depth--;
        if (depth === 0) { p++; break; }
      }
      if (depth === 1 && isPunct(tk, ',')) { flush(); p++; continue; }
      current.push(tk);
      raw += tokenSpacing(current, tk);
      p++;
    }
    flush();
    return { params, raw: raw.trim() };
  }

  // Parseia tokens de um único parâmetro: [modifiers] Type name [= default]
  function parseOneParam(toks) {
    let owns = false, out = false, isConst = false;
    let idx = 0;
    while (idx < toks.length && toks[idx].t === 'id' && KEYWORD_MODIFIERS.has(toks[idx].v)) {
      const v = toks[idx].v;
      if (v === 'ref' || v === 'autoptr') owns = true;
      else if (v === 'out' || v === 'inout') out = true;
      else if (v === 'const') isConst = true;
      idx++;
    }
    // tipo (com generics)
    let type = '';
    if (idx < toks.length && toks[idx].t === 'id') {
      type = toks[idx].v; idx++;
      if (idx < toks.length && isPunct(toks[idx], '<')) {
        let depth = 0, buf = '';
        while (idx < toks.length) {
          const tk = toks[idx];
          if (isPunct(tk, '<')) depth++;
          buf += tk.v;
          idx++;
          if (isPunct(tk, '>')) { depth--; if (depth === 0) break; }
        }
        type += normalizeGenerics(buf);
      }
    }
    // nome
    let name = null;
    if (idx < toks.length && toks[idx].t === 'id') { name = toks[idx].v; idx++; }
    // default (após =)
    let def = null;
    const eq = toks.findIndex((t, k) => k >= idx && isPunct(t, '='));
    if (eq >= 0) {
      def = toks.slice(eq + 1).map(t => t.v).join('').trim() || null;
    }
    return { type: (owns ? '' : '') + type, name, default: def, owns, out, isConst };
  }

  // Pula um bloco balanceado {...} a partir de p (que deve estar em '{').
  // Retorna a linha do '}' final.
  function skipBraceBlock() {
    let depth = 0;
    let endLine = peek() ? peek().line : 0;
    while (p < N) {
      const tk = peek();
      if (isPunct(tk, '{')) depth++;
      else if (isPunct(tk, '}')) { depth--; endLine = tk.line; if (depth === 0) { p++; break; } }
      p++;
    }
    return endLine;
  }

  // Pula até ';' ou até um bloco {...} (o que vier primeiro), sem entrar em recursão.
  function skipToStatementEnd() {
    while (p < N) {
      const tk = peek();
      if (isPunct(tk, ';')) { p++; return; }
      if (isPunct(tk, '{')) { skipBraceBlock(); return; }
      p++;
    }
  }

  // Parseia o corpo de uma classe entre { e }. Popula members/methods.
  function parseClassBody(cls) {
    // assume peek() === '{'
    p++; // consome {
    while (p < N) {
      const tk = peek();
      if (isPunct(tk, '}')) { cls.lineEnd = tk.line; p++; return; }
      if (isPunct(tk, ';')) { p++; continue; }
      if (isPunct(tk, '{')) { skipBraceBlock(); continue; } // bloco solto
      // classe/enum aninhados
      if (isId(tk, 'class') || (isId(tk, 'modded') && isId(peek(1), 'class'))) {
        parseClassDecl(cls.name); continue;
      }
      if (isId(tk, 'enum')) { parseEnumDecl(cls.name); continue; }
      if (tk.t === 'pp') { p++; continue; }
      // membro ou método
      parseMemberOrMethod(cls);
    }
  }

  // Detecta e registra membro (campo) ou método dentro de uma classe.
  function parseMemberOrMethod(cls) {
    const startLine = peek().line;
    const modifiers = [];
    // coleta modificadores líderes
    while (isId(peek()) && KEYWORD_MODIFIERS.has(peek().v)) {
      const v = peek().v;
      if (!modifiers.includes(v)) modifiers.push(v);
      // 'ref'/'autoptr' são ownership do tipo, não modificador de método — mas
      // registramos como modificador informativo; readType os reconsome? Não:
      // já consumimos aqui. Para tipo, tratamos abaixo.
      p++;
    }
    // Após modificadores, esperamos: Tipo Nome ...  OU  Nome(...) (construtor/destrutor)
    // Construtor/destrutor: peek é id e peek(1) é '(' (sem tipo de retorno)
    // Destrutor: peek é '~'
    let isDtor = false;
    if (isPunct(peek(), '~')) { isDtor = true; p++; }

    // Caso: Nome( → construtor/destrutor (sem tipo de retorno)
    if (isId(peek()) && isPunct(peek(1), '(')) {
      const name = (isDtor ? '~' : '') + peek().v;
      p++;
      const { params, raw } = readParams();
      const method = buildMethod(cls, name, '', params, raw, modifiers, startLine);
      // corpo ou ;
      finishMethod(method);
      return;
    }

    // Caso geral: Tipo [generics] Nome ...
    let type = '';
    if (isId(peek())) {
      type = peek().v; p++;
      if (isPunct(peek(), '<')) {
        let depth = 0, buf = '';
        while (p < N) {
          const t2 = peek();
          if (isPunct(t2, '<')) depth++;
          buf += t2.v; p++;
          if (isPunct(t2, '>')) { depth--; if (depth === 0) break; }
        }
        type += normalizeGenerics(buf);
      }
    } else {
      // não é declaração reconhecível — pula statement
      skipToStatementEnd();
      return;
    }

    // Agora peek deve ser o nome
    if (!isId(peek())) {
      // Ex.: 'const int X = 5;' já consumido 'int' como type; nome ausente → pula
      skipToStatementEnd();
      return;
    }
    const name = peek().v; p++;

    if (isPunct(peek(), '(')) {
      // MÉTODO
      const { params, raw } = readParams();
      const method = buildMethod(cls, name, type, params, raw, modifiers, startLine);
      finishMethod(method);
      return;
    }

    // MEMBRO (campo). Pode ter array [N], múltiplas vars por vírgula, inicializador.
    // Registra o primeiro nome; varre nomes adicionais separados por vírgula.
    registerMember(cls, name, type, modifiers, startLine);
    while (p < N) {
      const tk = peek();
      if (isPunct(tk, ';')) { p++; break; }
      if (isPunct(tk, ',')) {
        p++;
        if (isId(peek())) { registerMember(cls, peek().v, type, modifiers, startLine); p++; }
        continue;
      }
      if (isPunct(tk, '{')) { skipBraceBlock(); break; } // inicializador de bloco raro
      if (isPunct(tk, '=')) { // pula default até ; ou ,
        p++;
        let d = 0;
        while (p < N) {
          const t2 = peek();
          if (d === 0 && (isPunct(t2, ';') || isPunct(t2, ','))) break;
          if (isPunct(t2, '(') || isPunct(t2, '{') || isPunct(t2, '[')) d++;
          if (isPunct(t2, ')') || isPunct(t2, '}') || isPunct(t2, ']')) d--;
          p++;
        }
        continue;
      }
      p++;
    }
  }

  function finishMethod(method) {
    // Após ')': ou ';' (proto/native/sem corpo) ou '{...}' (corpo).
    // Pode haver mais modificadores pós-assinatura? raro. Pula até { ou ;.
    while (p < N && !isPunct(peek(), '{') && !isPunct(peek(), ';')) {
      // ex.: 'proto native ...' tokens residuais — normalmente já tratados
      p++;
    }
    if (isPunct(peek(), '{')) {
      method.lineEnd = skipBraceBlock();
    } else if (isPunct(peek(), ';')) {
      method.lineEnd = method.line;
      p++;
    }
  }

  function buildMethod(cls, name, returnType, params, raw, modifiers, line) {
    const paramStr = params.map(pp => {
      let s = pp.owns ? 'ref ' : '';
      if (pp.out) s = 'out ' + s;
      s += pp.type;
      if (pp.name) s += ' ' + pp.name;
      if (pp.default) s += ' = ' + pp.default;
      return s.trim();
    }).join(', ');
    const signature = `${returnType ? returnType + ' ' : ''}${name}(${paramStr})`.trim();
    const method = {
      name, returnType, params, signature,
      modifiers: modifiers.slice(),
      line, lineEnd: line,
    };
    if (cls) cls.methods.push(method);
    else result.functions.push(method);
    return method;
  }

  function registerMember(cls, name, type, modifiers, line) {
    cls.members.push({
      name, type,
      modifiers: modifiers.filter(m => m !== 'ref' && m !== 'autoptr'),
      owns: modifiers.includes('ref') || modifiers.includes('autoptr'),
      line,
    });
  }

  // Parseia `[modded] class Name [extends|: Parent] { ... };`
  function parseClassDecl(ownerName) {
    const startLine = peek().line;
    let isModded = false;
    if (isId(peek(), 'modded')) { isModded = true; p++; }
    if (!isId(peek(), 'class')) { p++; return; }
    p++; // class
    if (!isId(peek())) { skipToStatementEnd(); return; }
    const name = peek().v; p++;
    let parent = null;
    if (isId(peek(), 'extends')) { p++; if (isId(peek())) { parent = peek().v; p++; } }
    else if (isPunct(peek(), ':')) { p++; if (isId(peek())) { parent = peek().v; p++; } }
    // pode haver template params ou nada; segue até '{' ou ';'
    const cls = {
      name, parent, isModded, line: startLine, lineEnd: startLine,
      members: [], methods: [], owner: ownerName || null,
    };
    // pula tokens até { ou ;
    while (p < N && !isPunct(peek(), '{') && !isPunct(peek(), ';')) p++;
    if (isPunct(peek(), '{')) {
      result.classes.push(cls);
      if (parent) result.refs.push({ name: parent, line: startLine, kind: isModded ? 'modded' : 'extends' });
      parseClassBody(cls);
      // ';' final opcional
      if (isPunct(peek(), ';')) p++;
    } else {
      // forward declaration `class X;`
      cls.lineEnd = cls.line;
      result.classes.push(cls);
      if (parent) result.refs.push({ name: parent, line: startLine, kind: 'extends' });
      if (isPunct(peek(), ';')) p++;
    }
  }

  function parseEnumDecl(ownerName) {
    const startLine = peek().line;
    p++; // enum
    let name = null;
    if (isId(peek())) { name = peek().v; p++; }
    // herança de enum: enum X : Y  ou  enum X extends Y (raro)
    if (isPunct(peek(), ':') || isId(peek(), 'extends')) { p++; if (isId(peek())) p++; }
    const en = { name: name || '(anon)', line: startLine, lineEnd: startLine, values: [], owner: ownerName || null };
    if (isPunct(peek(), '{')) {
      p++; // {
      while (p < N && !isPunct(peek(), '}')) {
        if (isId(peek())) {
          en.values.push({ name: peek().v, line: peek().line });
          p++;
          // pula '= valor' e ','
          while (p < N && !isPunct(peek(), ',') && !isPunct(peek(), '}')) p++;
          if (isPunct(peek(), ',')) p++;
        } else { p++; }
      }
      if (isPunct(peek(), '}')) { en.lineEnd = peek().line; p++; }
      if (isPunct(peek(), ';')) p++;
    }
    result.enums.push(en);
  }

  function parseTypedef() {
    const line = peek().line;
    p++; // typedef
    // typedef <tipo...> Alias;
    const typeToks = [];
    while (p < N && !isPunct(peek(), ';')) { typeToks.push(peek()); p++; }
    if (isPunct(peek(), ';')) p++;
    if (typeToks.length >= 2) {
      const alias = typeToks[typeToks.length - 1].v;
      const aliasOf = typeToks.slice(0, -1).map(t => t.v).join('');
      result.typedefs.push({ name: alias, aliasOf, line });
    }
  }

  // ─── loop principal (nível global) ────────────────────────────────────────
  while (p < N) {
    const tk = peek();
    if (tk.t === 'pp') { p++; continue; }
    if (isPunct(tk, ';') || isPunct(tk, '{') || isPunct(tk, '}')) {
      if (isPunct(tk, '{')) { skipBraceBlock(); continue; }
      p++; continue;
    }
    if (isId(tk, 'typedef')) { parseTypedef(); continue; }
    if (isId(tk, 'class') || (isId(tk, 'modded') && isId(peek(1), 'class'))) {
      parseClassDecl(null); continue;
    }
    if (isId(tk, 'enum')) { parseEnumDecl(null); continue; }
    // função global ou const global: Tipo Nome(...)  ou  const Tipo Nome = ...;
    parseGlobalDeclOrSkip();
  }

  return result;

  // Declaração global: função (Tipo Nome(...)) ou const. Se não reconhecer, pula.
  function parseGlobalDeclOrSkip() {
    const startLine = peek().line;
    const save = p;
    const modifiers = [];
    while (isId(peek()) && KEYWORD_MODIFIERS.has(peek().v)) {
      if (!modifiers.includes(peek().v)) modifiers.push(peek().v);
      p++;
    }
    const isConst = modifiers.includes('const');
    if (!isId(peek())) { p = save + 1; return; }
    // tipo
    let type = peek().v; p++;
    if (isPunct(peek(), '<')) {
      let depth = 0, buf = '';
      while (p < N) { const t2 = peek(); if (isPunct(t2, '<')) depth++; buf += t2.v; p++; if (isPunct(t2, '>')) { depth--; if (depth === 0) break; } }
      type += normalizeGenerics(buf);
    }
    if (!isId(peek())) { p = save + 1; return; }
    const name = peek().v; p++;
    if (isPunct(peek(), '(')) {
      const { params, raw } = readParams();
      const method = buildMethod(null, name, type, params, raw, modifiers, startLine);
      finishMethod(method);
    } else {
      // const/global var
      if (isConst) result.consts.push({ name, type, line: startLine });
      skipToStatementEnd();
    }
  }
}

// Normaliza a string de generics coletada dos tokens, inserindo espaços após
// vírgulas e removendo espaços redundantes. Ex.: "<string,refarray<Object>>"
// → "<string, ref array<Object>>" não é reconstruível perfeitamente sem espaços
// originais, então mantemos compacto mas legível.
function normalizeGenerics(buf) {
  // buf já contém apenas caracteres de token concatenados. Insere espaço após
  // vírgulas e antes de 'ref'/'autoptr' quando colados a um identificador.
  let s = buf.replace(/,/g, ', ');
  s = s.replace(/\b(ref|autoptr)(?=[A-Za-z])/g, '$1 ');
  return s;
}

// Espaçamento simples para reconstruir 'raw' de params (uso interno).
function tokenSpacing(list, tk) {
  return (tk.t === 'id' ? ' ' + tk.v : tk.v);
}

export default { parseEnscript };
