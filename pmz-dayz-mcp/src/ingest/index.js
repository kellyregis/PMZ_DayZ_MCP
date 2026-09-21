// src/ingest/index.js — pipeline de ingestão. Discover + hash + parse + resolve + store.
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { openDb, setMeta } from '../db/database.js';
import { parseEnscript } from '../parser/enscript.js';
import { parseConfig } from '../parser/config.js';
import { indexKnowledgeBase } from '../kb/index.js';

const log = (...a) => console.error('[ingest]', ...a);

function sha1(buf) { return crypto.createHash('sha1').update(buf).digest('hex'); }

function walk(dir, exts) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { out.push(...walk(full, exts)); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (exts.includes(ext)) out.push(full);
  }
  return out;
}

function moduleOf(relPath) {
  const seg = relPath.split(/[\\/]/)[0];
  if (['1_Core', '2_GameLib', '3_Game', '4_World', '5_Mission'].includes(seg)) return seg;
  if (relPath.endsWith('config.cpp')) return 'config';
  return 'other';
}

/**
 * Indexa uma versão do jogo no DB.
 * @param {import('better-sqlite3').Database} db
 * @param {string} version
 * @param {string} root  raiz da versão (contém scripts/ ou é a pasta com scripts)
 * @param {{incremental?: boolean}} opts
 */
export function indexVersion(db, version, root, opts = {}) {
  const scriptsDir = fs.existsSync(path.join(root, 'scripts')) ? path.join(root, 'scripts')
    : (fs.existsSync(path.join(root, 'Scripts')) ? path.join(root, 'Scripts') : root);
  log(`versão ${version}: scripts em ${scriptsDir}`);

  // Coleta de arquivos: .c dos scripts + config.cpp (bin e scripts)
  const cFiles = walk(scriptsDir, ['.c']);
  const configFiles = [];
  for (const cand of [path.join(root, 'bin', 'config.cpp'), path.join(scriptsDir, 'config.cpp')]) {
    if (fs.existsSync(cand)) configFiles.push(cand);
  }

  const existing = new Map(
    db.prepare('SELECT path, sha1, id FROM files WHERE game_version=?').all(version).map(r => [r.path, r])
  );

  // statements
  const insFile = db.prepare(`INSERT INTO files(path,abs_path,module,kind,game_version,sha1,parse_quality)
    VALUES(?,?,?,?,?,?,?)`);
  const delSymByFile = db.prepare('DELETE FROM symbols WHERE file_id=?');
  const delInhByFile = db.prepare('DELETE FROM inheritance WHERE child_id IN (SELECT id FROM symbols WHERE file_id=?)');
  const delRefByFile = db.prepare('DELETE FROM refs WHERE file_id=?');
  const delCfgByFile = db.prepare('DELETE FROM config_classes WHERE file_id=?');
  const delFile = db.prepare('DELETE FROM files WHERE id=?');

  const insSym = db.prepare(`INSERT INTO symbols
    (name,name_lc,kind,file_id,line_start,line_end,owner_id,owner_name,signature,return_type,member_type,modifiers,is_modded,parent_name,game_version)
    VALUES (@name,@name_lc,@kind,@file_id,@line_start,@line_end,@owner_id,@owner_name,@signature,@return_type,@member_type,@modifiers,@is_modded,@parent_name,@game_version)`);
  const insParam = db.prepare(`INSERT INTO method_params(method_id,ord,type,name,default_val,is_out,owns) VALUES(?,?,?,?,?,?,?)`);
  const insInh = db.prepare(`INSERT INTO inheritance(child_id,child_name,parent_name,game_version) VALUES(?,?,?,?)`);
  const insModded = db.prepare(`INSERT INTO modded_overrides(target_name,symbol_id,game_version) VALUES(?,?,?)`);
  const insRef = db.prepare(`INSERT INTO refs(symbol_name,file_id,line,ref_kind,game_version) VALUES(?,?,?,?,?)`);
  const insCfg = db.prepare(`INSERT INTO config_classes(root,name,name_lc,parent_name,file_id,line_start,game_version) VALUES(?,?,?,?,?,?,?)`);
  const insCfgP = db.prepare(`INSERT INTO config_params(class_id,key,value,is_array) VALUES(?,?,?,?)`);
  const insFts = db.prepare(`INSERT INTO fts_search(name,kind,body,ref_id,source_kind,game_version) VALUES(?,?,?,?,?,?)`);

  let nFiles = 0, nSkipped = 0, nClasses = 0, nMethods = 0, nDegraded = 0;

  const processScript = (abs) => {
    const rel = path.relative(root, abs);
    const buf = fs.readFileSync(abs);
    const hash = sha1(buf);
    const prev = existing.get(rel);
    if (opts.incremental && prev && prev.sha1 === hash) { existing.delete(rel); nSkipped++; return; }
    if (prev) { // mudou → limpa antigo
      delInhByFile.run(prev.id); delSymByFile.run(prev.id); delRefByFile.run(prev.id); delCfgByFile.run(prev.id); delFile.run(prev.id);
      existing.delete(rel);
    }
    const src = buf.toString('utf8');
    const parsed = parseEnscript(src, rel);
    if (parsed.parseQuality !== 'ok') nDegraded++;
    const fileId = insFile.run(rel, abs, moduleOf(rel), 'script', version, hash, parsed.parseQuality).lastInsertRowid;
    nFiles++;

    // classes
    for (const cls of parsed.classes) {
      const symId = insSym.run({
        name: cls.name, name_lc: cls.name.toLowerCase(), kind: 'class', file_id: fileId,
        line_start: cls.line, line_end: cls.lineEnd || cls.line, owner_id: null,
        owner_name: cls.owner || null, signature: null, return_type: null, member_type: null,
        modifiers: JSON.stringify(cls.isModded ? ['modded'] : []), is_modded: cls.isModded ? 1 : 0,
        parent_name: cls.parent || null, game_version: version,
      }).lastInsertRowid;
      nClasses++;
      insFts.run(cls.name, 'class', cls.name + (cls.parent ? ' extends ' + cls.parent : ''), symId, 'symbol', version);
      if (cls.parent) insInh.run(symId, cls.name, cls.parent, version);
      if (cls.isModded) insModded.run(cls.name, symId, version);

      for (const m of cls.methods) {
        const mid = insSym.run({
          name: m.name, name_lc: m.name.toLowerCase(), kind: 'method', file_id: fileId,
          line_start: m.line, line_end: m.lineEnd || m.line, owner_id: symId, owner_name: cls.name,
          signature: m.signature, return_type: m.returnType || null, member_type: null,
          modifiers: JSON.stringify(m.modifiers || []), is_modded: cls.isModded ? 1 : 0,
          parent_name: null, game_version: version,
        }).lastInsertRowid;
        nMethods++;
        (m.params || []).forEach((pp, i) => insParam.run(mid, i, pp.type || '', pp.name || null, pp.default || null, pp.out ? 1 : 0, pp.owns ? 1 : 0));
        insFts.run(m.name, 'method', `${cls.name}.${m.signature}`, mid, 'symbol', version);
      }
      for (const mem of cls.members) {
        insSym.run({
          name: mem.name, name_lc: mem.name.toLowerCase(), kind: 'member', file_id: fileId,
          line_start: mem.line, line_end: mem.line, owner_id: symId, owner_name: cls.name,
          signature: null, return_type: null, member_type: mem.type || null,
          modifiers: JSON.stringify(mem.modifiers || []), is_modded: 0, parent_name: null, game_version: version,
        });
      }
    }
    // enums
    for (const en of parsed.enums) {
      const eid = insSym.run({
        name: en.name, name_lc: en.name.toLowerCase(), kind: 'enum', file_id: fileId,
        line_start: en.line, line_end: en.lineEnd || en.line, owner_id: null, owner_name: en.owner || null,
        signature: null, return_type: null, member_type: null, modifiers: '[]', is_modded: 0, parent_name: null, game_version: version,
      }).lastInsertRowid;
      insFts.run(en.name, 'enum', en.name, eid, 'symbol', version);
      for (const val of en.values) {
        insSym.run({
          name: val.name, name_lc: val.name.toLowerCase(), kind: 'enum_value', file_id: fileId,
          line_start: val.line, line_end: val.line, owner_id: eid, owner_name: en.name,
          signature: null, return_type: null, member_type: null, modifiers: '[]', is_modded: 0, parent_name: null, game_version: version,
        });
      }
    }
    // typedefs
    for (const td of parsed.typedefs) {
      insSym.run({
        name: td.name, name_lc: td.name.toLowerCase(), kind: 'typedef', file_id: fileId,
        line_start: td.line, line_end: td.line, owner_id: null, owner_name: null,
        signature: `typedef ${td.aliasOf} ${td.name}`, return_type: td.aliasOf, member_type: null,
        modifiers: '[]', is_modded: 0, parent_name: null, game_version: version,
      });
    }
    // funções globais
    for (const fn of parsed.functions) {
      const fid = insSym.run({
        name: fn.name, name_lc: fn.name.toLowerCase(), kind: 'function', file_id: fileId,
        line_start: fn.line, line_end: fn.lineEnd || fn.line, owner_id: null, owner_name: null,
        signature: fn.signature, return_type: fn.returnType || null, member_type: null,
        modifiers: JSON.stringify(fn.modifiers || []), is_modded: 0, parent_name: null, game_version: version,
      }).lastInsertRowid;
      (fn.params || []).forEach((pp, i) => insParam.run(fid, i, pp.type || '', pp.name || null, pp.default || null, pp.out ? 1 : 0, pp.owns ? 1 : 0));
      insFts.run(fn.name, 'function', fn.signature, fid, 'symbol', version);
    }
    // refs: extends/modded (do parser) + `new X` (regex leve sobre masked-free source)
    for (const rf of parsed.refs) insRef.run(rf.name, fileId, rf.line, rf.kind, version);
    collectNewRefs(src).forEach(({ name, line }) => insRef.run(name, fileId, line, 'new', version));
  };

  const processConfig = (abs) => {
    const rel = path.relative(root, abs);
    const buf = fs.readFileSync(abs);
    const hash = sha1(buf);
    const prev = existing.get(rel);
    if (opts.incremental && prev && prev.sha1 === hash) { existing.delete(rel); nSkipped++; return; }
    if (prev) { delCfgByFile.run(prev.id); delFile.run(prev.id); existing.delete(rel); }
    const parsed = parseConfig(buf.toString('utf8'), rel);
    const fileId = insFile.run(rel, abs, 'config', 'config', version, hash, parsed.parseQuality).lastInsertRowid;
    nFiles++;
    for (const c of parsed.classes) {
      const cid = insCfg.run(c.root, c.name, c.name.toLowerCase(), c.parent || null, fileId, c.line, version).lastInsertRowid;
      for (const pr of c.params) {
        const val = pr.isArray ? JSON.stringify(pr.value) : String(pr.value);
        insCfgP.run(cid, pr.key, val, pr.isArray ? 1 : 0);
      }
    }
  };

  const tx = db.transaction(() => {
    for (const f of cFiles) { try { processScript(f); } catch (e) { log('erro script', f, e.message); } }
    for (const f of configFiles) { try { processConfig(f); } catch (e) { log('erro config', f, e.message); } }
    // arquivos removidos (sobraram em existing e não foram tocados)
    if (opts.incremental) {
      for (const [, row] of existing) {
        delInhByFile.run(row.id); delSymByFile.run(row.id); delRefByFile.run(row.id); delCfgByFile.run(row.id); delFile.run(row.id);
      }
    }
  });
  tx();

  log(`versão ${version}: ${nFiles} arquivos (${nSkipped} inalterados), ${nClasses} classes, ${nMethods} métodos, ${nDegraded} degraded`);
  return { nFiles, nClasses, nMethods, nDegraded, nSkipped };
}

// Coleta ocorrências de `new X` para find_references (kind='new'). Leve e tolerante.
function collectNewRefs(src) {
  const out = [];
  const lines = src.split('\n');
  const re = /\bnew\s+([A-Za-z_]\w*)/g;
  for (let i = 0; i < lines.length; i++) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(lines[i])) !== null) out.push({ name: m[1], line: i + 1 });
  }
  return out;
}

/**
 * Ponto de entrada de build completo/inicial de uma ou mais versões.
 */
export function buildIndex({ dbPath, versions, incremental = false, withKb = true }) {
  const db = openDb(dbPath);
  const t0 = Date.now();
  const stats = {};
  for (const { version, root } of versions) {
    if (!fs.existsSync(root)) { log(`⚠️  raiz não existe p/ ${version}: ${root}`); continue; }
    stats[version] = indexVersion(db, version, root, { incremental });
  }
  if (withKb) {
    const nDocs = indexKnowledgeBase(db);
    log(`knowledge base: ${nDocs} docs indexados`);
  }
  setMeta(db, 'indexed_at', new Date().toISOString());
  setMeta(db, 'schema_version', '1');
  db.exec('PRAGMA optimize');
  db.close();
  log(`concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  return stats;
}
