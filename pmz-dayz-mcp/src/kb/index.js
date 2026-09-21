// src/kb/index.js — indexação da Knowledge Base curada + docs legados.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CURATED_DIR = __dirname;                                  // src/kb/*.md
const LEGACY_DIR = path.join(__dirname, '..', 'knowledge-base'); // docs antigos do Kelly

// Parser simples de front-matter (--- ... ---) sem dependência de YAML.
export function parseFrontMatter(raw) {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: raw };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^\s*([\w-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      v = v.replace(/^["']|["']$/g, '');
    }
    meta[kv[1]] = v;
  }
  return { meta, body: m[2] };
}

function walkMd(dir) {
  const out = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkMd(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/**
 * Popula as tabelas docs + fts_search. Retorna número de docs indexados.
 */
export function indexKnowledgeBase(db) {
  db.exec('DELETE FROM docs');
  db.exec(`DELETE FROM fts_search WHERE source_kind='doc'`);
  const insDoc = db.prepare(`INSERT INTO docs(doc_id,title,subsystem,category,tags,body,game_version,last_verified)
    VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(doc_id) DO NOTHING`);
  const insFts = db.prepare(`INSERT INTO fts_search(name,kind,body,ref_id,source_kind,game_version) VALUES(?,?,?,?,?,?)`);

  let n = 0;
  const seen = new Set();

  const addFile = (file, source) => {
    const raw = fs.readFileSync(file, 'utf8');
    const { meta, body } = parseFrontMatter(raw);
    const base = path.basename(file, '.md');
    const docId = (meta.id || base).trim();
    if (seen.has(docId)) return;
    const title = meta.title || firstHeading(body) || base;
    const subsystem = meta.subsystem || path.basename(path.dirname(file));
    const category = meta.category || (source === 'legacy' ? path.basename(path.dirname(file)) : 'curated');
    const tags = Array.isArray(meta.tags) ? JSON.stringify(meta.tags) : (meta.tags ? JSON.stringify([meta.tags]) : '[]');
    const info = insDoc.run(docId, title, subsystem, category, tags, body, meta.game_version || null, meta.last_verified || null);
    if (info.changes > 0) {
      const row = db.prepare('SELECT id FROM docs WHERE doc_id=?').get(docId);
      insFts.run(title, 'doc', title + '\n' + body, row.id, 'doc', meta.game_version || '');
      seen.add(docId); n++;
    }
  };

  for (const f of walkMd(CURATED_DIR)) { if (path.basename(f) === 'index.js') continue; try { addFile(f, 'curated'); } catch (e) { console.error('[kb] erro', f, e.message); } }
  for (const f of walkMd(LEGACY_DIR)) { try { addFile(f, 'legacy'); } catch (e) { console.error('[kb] erro', f, e.message); } }
  return n;
}

function firstHeading(body) {
  const m = body.match(/^#+\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

export default { indexKnowledgeBase, parseFrontMatter };
