// src/db/queries.js — camada de consultas preparadas sobre o índice SQLite.
// Toda a lógica de herança (flatten), config resolve e paginação vive aqui.
import fs from 'fs';

export class Queries {
  constructor(db) {
    this.db = db;
  }

  versions() {
    return this.db.prepare('SELECT DISTINCT game_version FROM files ORDER BY game_version').all().map(r => r.game_version);
  }

  defaultVersion() {
    const vs = this.versions();
    return vs.includes('1.29') ? '1.29' : (vs[0] || '1.29');
  }

  // ─── RF-01 busca de símbolo ────────────────────────────────────────────────
  searchSymbol(query, { kind, limit = 25, version } = {}) {
    const v = version || this.defaultVersion();
    const q = query.toLowerCase();
    const params = [q, `${q}%`, `%${q}%`, v];
    let sql = `SELECT s.id, s.name, s.kind, s.owner_name, s.signature, s.parent_name,
                      f.path AS file, s.line_start AS line, s.is_modded
               FROM symbols s JOIN files f ON f.id = s.file_id
               WHERE s.name_lc LIKE ? AND s.game_version = ?`;
    const args = [`%${q}%`, v];
    if (kind) { sql += ' AND s.kind = ?'; args.push(kind); }
    // ranking: exato > prefixo > substring, depois classes primeiro
    sql += ` ORDER BY (CASE WHEN s.name_lc = ? THEN 0 WHEN s.name_lc LIKE ? THEN 1 ELSE 2 END),
                      (CASE WHEN s.kind='class' THEN 0 ELSE 1 END), length(s.name) LIMIT ?`;
    args.push(q, `${q}%`, Math.min(limit, 50));
    return this.db.prepare(sql).all(...args);
  }

  // ─── RF-02 classe completa ─────────────────────────────────────────────────
  getClass(name, { includeInherited = false, version } = {}) {
    const v = version || this.defaultVersion();
    const cls = this.db.prepare(
      `SELECT s.*, f.path AS file FROM symbols s JOIN files f ON f.id=s.file_id
       WHERE s.name_lc=? AND s.kind='class' AND s.game_version=?
       ORDER BY s.is_modded ASC LIMIT 1`
    ).get(name.toLowerCase(), v);
    if (!cls) return null;

    const own = this._classMembersMethods(cls.id);
    const children = this.db.prepare(
      `SELECT DISTINCT child_name FROM inheritance WHERE parent_name=? AND game_version=? ORDER BY child_name LIMIT 60`
    ).all(cls.name, v).map(r => r.child_name);
    const moddedBy = this.db.prepare(
      `SELECT s.id, f.path AS file, s.line_start AS line FROM modded_overrides m
       JOIN symbols s ON s.id=m.symbol_id JOIN files f ON f.id=s.file_id
       WHERE m.target_name=? AND m.game_version=?`
    ).all(cls.name, v);

    const out = {
      name: cls.name,
      parent: cls.parent_name || null,
      file: cls.file,
      line: cls.line_start,
      is_modded: !!cls.is_modded,
      children,
      modded_by: moddedBy,
      members: own.members,
      methods: own.methods,
    };

    if (includeInherited) {
      const chain = this._ancestors(cls.name, v);
      out.inherited = [];
      for (const anc of chain) {
        const ac = this.db.prepare(
          `SELECT id, name FROM symbols WHERE name_lc=? AND kind='class' AND game_version=? LIMIT 1`
        ).get(anc.toLowerCase(), v);
        if (!ac) continue;
        const am = this._classMembersMethods(ac.id);
        out.inherited.push({ from: ac.name, members: am.members, methods: am.methods });
      }
    }
    return out;
  }

  _classMembersMethods(classId) {
    const methods = this.db.prepare(
      `SELECT name, signature, return_type, modifiers, line_start AS line, is_modded
       FROM symbols WHERE owner_id=? AND kind='method' ORDER BY line_start`
    ).all(classId).map(m => ({ ...m, modifiers: safeJson(m.modifiers) }));
    const members = this.db.prepare(
      `SELECT name, member_type AS type, modifiers, line_start AS line
       FROM symbols WHERE owner_id=? AND kind='member' ORDER BY line_start`
    ).all(classId).map(m => ({ ...m, modifiers: safeJson(m.modifiers) }));
    return { methods, members };
  }

  // ─── RF-03 cadeia de herança ───────────────────────────────────────────────
  _ancestors(name, v, depth = 30) {
    const chain = [];
    const seen = new Set([name.toLowerCase()]);
    let cur = name;
    const stmt = this.db.prepare(
      `SELECT parent_name FROM symbols WHERE name_lc=? AND kind='class' AND game_version=? AND parent_name IS NOT NULL LIMIT 1`
    );
    while (chain.length < depth) {
      const row = stmt.get(cur.toLowerCase(), v);
      if (!row || !row.parent_name) break;
      const par = row.parent_name;
      if (seen.has(par.toLowerCase())) break;
      chain.push(par); seen.add(par.toLowerCase());
      cur = par;
    }
    return chain;
  }

  _descendants(name, v, depth = 4, limitPerLevel = 40) {
    const stmt = this.db.prepare(
      `SELECT DISTINCT child_name FROM inheritance WHERE parent_name=? AND game_version=? ORDER BY child_name LIMIT ?`
    );
    const build = (n, d) => {
      if (d <= 0) return [];
      const kids = stmt.all(n, v, limitPerLevel).map(r => r.child_name);
      return kids.map(k => ({ name: k, children: build(k, d - 1) }));
    };
    return build(name, depth);
  }

  inheritanceChain(name, { direction = 'up', depth = 30, version } = {}) {
    const v = version || this.defaultVersion();
    const exists = this.db.prepare(
      `SELECT name FROM symbols WHERE name_lc=? AND kind='class' AND game_version=? LIMIT 1`
    ).get(name.toLowerCase(), v);
    const canon = exists ? exists.name : name;
    const out = { name: canon, version: v };
    if (direction === 'up' || direction === 'both') {
      const anc = this._ancestors(canon, v, depth);
      out.ancestors = anc.map(a => {
        const loc = this.db.prepare(
          `SELECT f.path AS file, s.line_start AS line FROM symbols s JOIN files f ON f.id=s.file_id
           WHERE s.name_lc=? AND s.kind='class' AND s.game_version=? LIMIT 1`
        ).get(a.toLowerCase(), v);
        return { name: a, file: loc?.file || null, line: loc?.line || null };
      });
    }
    if (direction === 'down' || direction === 'both') {
      out.descendants = this._descendants(canon, v, Math.min(depth, 5));
    }
    return out;
  }

  // ─── RF-04 método + overloads/overrides ────────────────────────────────────
  getMethod(method, { className, version } = {}) {
    const v = version || this.defaultVersion();
    let rows;
    if (className) {
      rows = this.db.prepare(
        `SELECT s.*, f.path AS file FROM symbols s JOIN files f ON f.id=s.file_id
         WHERE s.name_lc=? AND s.kind='method' AND s.owner_name=? AND s.game_version=? ORDER BY s.is_modded`
      ).all(method.toLowerCase(), className, v);
      // se não achou na própria classe, procura na cadeia de ancestrais
      if (!rows.length) {
        for (const anc of this._ancestors(className, v)) {
          rows = this.db.prepare(
            `SELECT s.*, f.path AS file FROM symbols s JOIN files f ON f.id=s.file_id
             WHERE s.name_lc=? AND s.kind='method' AND s.owner_name=? AND s.game_version=? ORDER BY s.is_modded`
          ).all(method.toLowerCase(), anc, v);
          if (rows.length) break;
        }
      }
    } else {
      rows = this.db.prepare(
        `SELECT s.*, f.path AS file FROM symbols s JOIN files f ON f.id=s.file_id
         WHERE s.name_lc=? AND s.kind='method' AND s.game_version=? ORDER BY s.owner_name LIMIT 40`
      ).all(method.toLowerCase(), v);
    }
    if (!rows.length) return null;
    return rows.map(r => ({
      owner: r.owner_name,
      signature: r.signature,
      return_type: r.return_type,
      modifiers: safeJson(r.modifiers),
      params: this.db.prepare(
        `SELECT ord, type, name, default_val, is_out, owns FROM method_params WHERE method_id=? ORDER BY ord`
      ).all(r.id),
      is_modded: !!r.is_modded,
      file: r.file,
      line: r.line_start,
    }));
  }

  // ─── RF-06 fonte por range ─────────────────────────────────────────────────
  getSource(file, lineStart, lineEnd, { version } = {}) {
    const v = version || this.defaultVersion();
    // resolve o arquivo dentro do índice (path exato ou sufixo) — anti path-traversal
    let row = this.db.prepare(
      `SELECT abs_path, path FROM files WHERE path=? AND game_version=? LIMIT 1`
    ).get(file, v);
    if (!row) {
      row = this.db.prepare(
        `SELECT abs_path, path FROM files WHERE (path LIKE ? OR abs_path LIKE ?) AND game_version=? ORDER BY length(path) LIMIT 1`
      ).get(`%${file}`, `%${file}`, v);
    }
    if (!row) return null;
    let content;
    try { content = fs.readFileSync(row.abs_path, 'utf8'); } catch { return null; }
    const lines = content.split('\n');
    const s = Math.max(1, lineStart | 0);
    const e = Math.min(lines.length, Math.min(lineEnd | 0, s + 199)); // teto 200 linhas
    const slice = lines.slice(s - 1, e).map((l, i) => `${s + i}\t${l}`).join('\n');
    return { file: row.path, line_start: s, line_end: e, code: slice };
  }

  // ─── RF-05 find references (paginado) ──────────────────────────────────────
  findReferences(name, { refKind, page = 1, pageSize = 25, version } = {}) {
    const v = version || this.defaultVersion();
    const args = [name, v];
    let where = 'r.symbol_name=? AND r.game_version=?';
    if (refKind) { where += ' AND r.ref_kind=?'; args.push(refKind); }
    const total = this.db.prepare(`SELECT COUNT(*) c FROM refs r WHERE ${where}`).get(...args).c;
    const offset = (Math.max(1, page) - 1) * pageSize;
    const rows = this.db.prepare(
      `SELECT f.path AS file, r.line, r.ref_kind FROM refs r JOIN files f ON f.id=r.file_id
       WHERE ${where} ORDER BY f.path, r.line LIMIT ? OFFSET ?`
    ).all(...args, pageSize, offset);
    return { total, page: Math.max(1, page), page_size: pageSize, pages: Math.ceil(total / pageSize), results: rows };
  }

  // ─── RF-09 hooks overridáveis ──────────────────────────────────────────────
  listHooks(className, { version } = {}) {
    const v = version || this.defaultVersion();
    // hooks = métodos da classe e ancestrais cujo nome bate padrões conhecidos
    const names = [className, ...this._ancestors(className, v)];
    const seen = new Set();
    const hooks = [];
    for (const cn of names) {
      const rows = this.db.prepare(
        `SELECT name, signature, owner_name, f.path AS file, s.line_start AS line
         FROM symbols s JOIN files f ON f.id=s.file_id
         WHERE s.owner_name=? AND s.kind='method' AND s.game_version=?`
      ).all(cn, v);
      for (const r of rows) {
        if (seen.has(r.name)) continue;
        if (isHookName(r.name)) { seen.add(r.name); hooks.push({ ...r, from: cn, doc: HOOK_DOCS[r.name] || '' }); }
      }
    }
    hooks.sort((a, b) => a.name.localeCompare(b.name));
    return { class: className, count: hooks.length, hooks };
  }

  // ─── RF-07 config resolvido (flatten) ──────────────────────────────────────
  getConfigClass(name, { root, resolveInheritance = true, version } = {}) {
    const v = version || this.defaultVersion();
    const args = [name.toLowerCase(), v];
    let sql = `SELECT * FROM config_classes WHERE name_lc=? AND game_version=?`;
    if (root) { sql += ' AND root=?'; args.push(root); }
    const cls = this.db.prepare(sql + ' LIMIT 1').get(...args);
    if (!cls) return null;
    const paramsOf = (id) => {
      const rows = this.db.prepare(`SELECT key, value, is_array FROM config_params WHERE class_id=?`).all(id);
      const o = {};
      for (const r of rows) o[r.key] = r.is_array ? safeJson(r.value) : r.value;
      return o;
    };
    const merged = {};
    const inheritedFrom = {};
    const chain = [];
    if (resolveInheritance) {
      // do topo (ancestral) para a folha, folha sobrescreve
      let cur = cls, guard = 0;
      const list = [];
      const seen = new Set();
      while (cur && guard++ < 40) {
        list.push(cur);
        if (!cur.parent_name || seen.has(cur.parent_name.toLowerCase())) break;
        seen.add(cur.parent_name.toLowerCase());
        cur = this.db.prepare(`SELECT * FROM config_classes WHERE name_lc=? AND game_version=? LIMIT 1`)
          .get(cur.parent_name.toLowerCase(), v);
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const c = list[i];
        chain.unshift(c.name);
        const pr = paramsOf(c.id);
        for (const [k, val] of Object.entries(pr)) { merged[k] = val; inheritedFrom[k] = c.name; }
      }
    } else {
      Object.assign(merged, paramsOf(cls.id));
      for (const k of Object.keys(merged)) inheritedFrom[k] = cls.name;
    }
    return {
      root: cls.root, name: cls.name, parent: cls.parent_name || null,
      chain, params: merged, inherited_from: inheritedFrom,
    };
  }

  // ─── RF-08 busca em config ─────────────────────────────────────────────────
  configSearch(query, { root, by = 'class', limit = 25, version } = {}) {
    const v = version || this.defaultVersion();
    const lim = Math.min(limit, 50);
    if (by === 'class') {
      const args = [`%${query.toLowerCase()}%`, v];
      let sql = `SELECT root, name, parent_name FROM config_classes WHERE name_lc LIKE ? AND game_version=?`;
      if (root) { sql += ' AND root=?'; args.push(root); }
      return this.db.prepare(sql + ' LIMIT ?').all(...args, lim);
    }
    if (by === 'param') {
      const args = [`%${query}%`, v];
      let sql = `SELECT c.root, c.name AS class, p.key, p.value FROM config_params p
                 JOIN config_classes c ON c.id=p.class_id WHERE p.key LIKE ? AND c.game_version=?`;
      if (root) { sql += ' AND c.root=?'; args.push(root); }
      return this.db.prepare(sql + ' LIMIT ?').all(...args, lim);
    }
    // by value
    const args = [`%${query}%`, v];
    let sql = `SELECT c.root, c.name AS class, p.key, p.value FROM config_params p
               JOIN config_classes c ON c.id=p.class_id WHERE p.value LIKE ? AND c.game_version=?`;
    if (root) { sql += ' AND c.root=?'; args.push(root); }
    return this.db.prepare(sql + ' LIMIT ?').all(...args, lim);
  }

  // ─── RF-10/11 KB + semântica (FTS) ─────────────────────────────────────────
  kbSearch(query, { subsystem, limit = 8 } = {}) {
    const rows = this._ftsDocs(query, Math.min(limit, 20));
    let docs = rows;
    if (subsystem) docs = docs.filter(d => (d.subsystem || '').toLowerCase() === subsystem.toLowerCase());
    return docs.map(d => ({
      doc_id: d.doc_id, title: d.title, subsystem: d.subsystem,
      excerpt: excerpt(d.body, query),
    }));
  }

  _ftsDocs(query, limit) {
    const m = ftsQuery(query);
    let ids = [];
    try {
      ids = this.db.prepare(
        `SELECT ref_id FROM fts_search WHERE source_kind='doc' AND fts_search MATCH ? ORDER BY rank LIMIT ?`
      ).all(m, limit).map(r => r.ref_id);
    } catch { ids = []; }
    if (!ids.length) {
      // fallback LIKE
      return this.db.prepare(
        `SELECT * FROM docs WHERE lower(title||' '||body) LIKE ? LIMIT ?`
      ).all(`%${query.toLowerCase()}%`, limit);
    }
    const ph = ids.map(() => '?').join(',');
    return this.db.prepare(`SELECT * FROM docs WHERE id IN (${ph})`).all(...ids);
  }

  semanticSearch(query, { scope = 'all', limit = 10, version } = {}) {
    const v = version || this.defaultVersion();
    const m = ftsQuery(query);
    const out = [];
    if (scope === 'all' || scope === 'docs') {
      for (const d of this._ftsDocs(query, limit)) {
        out.push({ source_kind: 'doc', ref: d.doc_id, preview: excerpt(d.body, query), score: 1 });
      }
    }
    if (scope === 'all' || scope === 'code') {
      let rows = [];
      try {
        rows = this.db.prepare(
          `SELECT s.name, s.kind, s.owner_name, s.signature, f.path AS file, s.line_start AS line
           FROM fts_search x JOIN symbols s ON s.id=x.ref_id JOIN files f ON f.id=s.file_id
           WHERE x.source_kind='symbol' AND x.game_version=? AND fts_search MATCH ? ORDER BY rank LIMIT ?`
        ).all(v, m, limit);
      } catch { rows = []; }
      for (const r of rows) {
        out.push({ source_kind: 'symbol', ref: (r.owner_name ? r.owner_name + '.' : '') + r.name,
          preview: r.signature || r.name, file: r.file, line: r.line, score: 1 });
      }
    }
    return out.slice(0, limit);
  }

  // ─── RF-12 api diff ────────────────────────────────────────────────────────
  apiDiff(from, to, { name, kind = 'class' } = {}) {
    if (kind === 'class') {
      const setOf = (ver) => new Set(
        this.db.prepare(`SELECT DISTINCT name FROM symbols WHERE kind='class' AND game_version=?`).all(ver).map(r => r.name)
      );
      const a = setOf(from), b = setOf(to);
      if (name) {
        // diff de métodos de uma classe
        return this._classMethodDiff(name, from, to);
      }
      const added = [...b].filter(x => !a.has(x)).sort();
      const removed = [...a].filter(x => !b.has(x)).sort();
      return { from, to, kind, added_count: added.length, removed_count: removed.length,
        added: added.slice(0, 200), removed: removed.slice(0, 200) };
    }
    return { from, to, kind, note: 'kind não suportado; use class' };
  }

  _classMethodDiff(className, from, to) {
    const methodsOf = (ver) => {
      const cls = this.db.prepare(`SELECT id FROM symbols WHERE name_lc=? AND kind='class' AND game_version=? LIMIT 1`)
        .get(className.toLowerCase(), ver);
      if (!cls) return null;
      const rows = this.db.prepare(`SELECT name, signature FROM symbols WHERE owner_id=? AND kind='method'`).all(cls.id);
      const map = new Map(); for (const r of rows) map.set(r.name, r.signature);
      return map;
    };
    const a = methodsOf(from), b = methodsOf(to);
    if (!a && !b) return { name: className, status: 'NOT_FOUND' };
    if (!a) return { name: className, status: `ADDED_IN_${to}` };
    if (!b) return { name: className, status: `REMOVED_IN_${to}` };
    const added = [], removed = [], changed = [];
    for (const [n, sig] of a) { if (!b.has(n)) removed.push(sig); else if (b.get(n) !== sig) changed.push({ from: sig, to: b.get(n) }); }
    for (const [n, sig] of b) { if (!a.has(n)) added.push(sig); }
    return { name: className, from, to, added, removed, changed };
  }

  // ─── meta/status ───────────────────────────────────────────────────────────
  indexStatus() {
    const versions = this.versions();
    const counts = {};
    for (const v of versions) {
      counts[v] = {
        classes: this.db.prepare(`SELECT COUNT(*) c FROM symbols WHERE kind='class' AND game_version=?`).get(v).c,
        methods: this.db.prepare(`SELECT COUNT(*) c FROM symbols WHERE kind='method' AND game_version=?`).get(v).c,
        members: this.db.prepare(`SELECT COUNT(*) c FROM symbols WHERE kind='member' AND game_version=?`).get(v).c,
        enums: this.db.prepare(`SELECT COUNT(*) c FROM symbols WHERE kind='enum' AND game_version=?`).get(v).c,
        config_classes: this.db.prepare(`SELECT COUNT(*) c FROM config_classes WHERE game_version=?`).get(v).c,
        files: this.db.prepare(`SELECT COUNT(*) c FROM files WHERE game_version=?`).get(v).c,
        degraded_files: this.db.prepare(`SELECT COUNT(*) c FROM files WHERE parse_quality!='ok' AND game_version=?`).get(v).c,
      };
    }
    const docs = this.db.prepare(`SELECT COUNT(*) c FROM docs`).get().c;
    let indexed_at = null;
    try { indexed_at = this.db.prepare(`SELECT value FROM meta WHERE key='indexed_at'`).get()?.value; } catch {}
    return { versions, counts, docs, indexed_at };
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function safeJson(s) { if (!s) return []; try { return JSON.parse(s); } catch { return s; } }

function ftsQuery(query) {
  // transforma "ref vs autoptr" em `ref OR autoptr` sanitizado p/ FTS5
  const toks = query.replace(/[^\p{L}\p{N}_\s]/gu, ' ').split(/\s+/).filter(t => t.length > 1);
  if (!toks.length) return '""';
  return toks.map(t => `"${t}"`).join(' OR ');
}

function excerpt(body, query, ctx = 220) {
  if (!body) return '';
  const toks = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lc = body.toLowerCase();
  let pos = -1;
  for (const t of toks) { const i = lc.indexOf(t); if (i >= 0 && (pos < 0 || i < pos)) pos = i; }
  if (pos < 0) return body.slice(0, ctx).trim() + (body.length > ctx ? '…' : '');
  const start = Math.max(0, pos - 60);
  return (start > 0 ? '…' : '') + body.slice(start, start + ctx).trim() + '…';
}

// Nomes de hooks reconhecidos (EnScript lifecycle/persistência/rede/action/inv)
function isHookName(n) {
  return /^(EE|On|Set|Can|Get)/.test(n) && (
    HOOK_DOCS[n] !== undefined ||
    /^EE[A-Z]/.test(n) ||
    /^On[A-Z]/.test(n) ||
    n === 'SetActions' || n === 'CanPutInCargo' || n === 'CanReceiveItem' || n === 'CanReleaseCargo'
  );
}

const HOOK_DOCS = {
  EEInit: 'Chamado quando a entidade é inicializada (após criação). Server+client.',
  EEDelete: 'Chamado quando a entidade é destruída. Limpar callbacks/UpdateQueue aqui.',
  EEItemLocationChanged: 'Item mudou de local no inventário (attach/detach/cargo).',
  EEHealthLevelChanged: 'Nível de saúde da zona mudou (PRISTINE..RUINED).',
  EEKilled: 'Entidade/player morreu. Cuidado com mods de revive.',
  EEHitBy: 'Entidade recebeu dano. Fonte, dmgZone, ammo.',
  EEOnCECreate: 'Criada pela Central Economy (spawn CE).',
  OnStoreSave: 'Serialização de persistência (ctx.Write). Ordem deve casar com OnStoreLoad.',
  OnStoreLoad: 'Desserialização (ctx.Read). Retorne false p/ abortar. Cheque version.',
  AfterStoreLoad: 'Pós-load, quando a entidade já existe.',
  OnRPC: 'Recebe RPC (sender, rpc_type, ctx). Validar server-side.',
  OnVariablesSynchronized: 'Cliente: variáveis sincronizadas do servidor chegaram.',
  SetActions: 'Registra ações (AddAction) disponíveis na entidade.',
  Init: 'Inicialização de script (diferente do construtor).',
  CanPutInCargo: 'Controla se um item pode entrar no cargo.',
  CanReceiveItem: 'Controla se o inventário aceita um item.',
  CanReleaseCargo: 'Controla saída de item do cargo (anti-roubo).',
};

export default { Queries };
