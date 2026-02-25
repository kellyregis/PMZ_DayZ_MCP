// src/indexer/ScriptIndexer.js
// Varre as pastas das versões DayZ e constrói índice em memória + cache

import fs   from 'fs';
import path from 'path';
import { FileParser } from './FileParser.js';
import { config }     from '../config.js';

export class ScriptIndexer {

  constructor() {
    this.index = {
      '1.28': { classes: {}, layouts: {}, files: [] },
      '1.29': { classes: {}, layouts: {}, files: [] },
    };
    this.ready = false;
  }

  // ─── INDEXAÇÃO ─────────────────────────────────────────────────────────────

  async buildIndex() {
    console.error('[MCP] Iniciando indexação dos scripts DayZ...');

    // Tenta carregar cache primeiro
    if (this._loadFromCache()) {
      console.error('[MCP] Índice carregado do cache ✅');
      this.ready = true;
      return;
    }

    await this._indexVersion('1.28', config.dayz128Path);
    await this._indexVersion('1.29', config.dayz129Path);

    this._saveToCache();
    this.ready = true;
    console.error(`[MCP] Indexação concluída ✅`);
    console.error(`[MCP] 1.28: ${Object.keys(this.index['1.28'].classes).length} classes, ${Object.keys(this.index['1.28'].layouts).length} layouts`);
    console.error(`[MCP] 1.29: ${Object.keys(this.index['1.29'].classes).length} classes, ${Object.keys(this.index['1.29'].layouts).length} layouts`);
  }

  async _indexVersion(version, basePath) {
    if (!fs.existsSync(basePath)) {
      console.error(`[MCP] ⚠️  Pasta não encontrada para ${version}: ${basePath}`);
      return;
    }

    console.error(`[MCP] Indexando ${version} em: ${basePath}`);

    // Indexa Scripts
    const scriptsPath = path.join(basePath, 'Scripts');
    if (fs.existsSync(scriptsPath)) {
      await this._walkDirectory(scriptsPath, version, 'script');
    }

    // Indexa GUI / Layouts
    const guiPath = path.join(basePath, 'GUI');
    if (fs.existsSync(guiPath)) {
      await this._walkDirectory(guiPath, version, 'gui');
    }
  }

  async _walkDirectory(dir, version, type) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this._walkDirectory(fullPath, version, type);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();

      if (type === 'script' && ext === '.c') {
        this._indexScriptFile(fullPath, version);
      } else if (type === 'gui' && (ext === '.layout' || ext === '.xml')) {
        this._indexLayoutFile(fullPath, version);
      }
    }
  }

  _indexScriptFile(filePath, version) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed  = FileParser.parseScriptFile(content, filePath);

      this.index[version].files.push(filePath);

      for (const cls of [...parsed.classes, ...parsed.modded]) {
        const key = cls.name.toLowerCase();
        if (!this.index[version].classes[key]) {
          this.index[version].classes[key] = [];
        }
        this.index[version].classes[key].push({
          ...cls,
          filePath,
          _content: content,   // guarda o conteúdo para diff
        });
      }
    } catch (err) {
      console.error(`[MCP] Erro ao indexar ${filePath}: ${err.message}`);
    }
  }

  _indexLayoutFile(filePath, version) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed  = FileParser.parseLayoutFile(content, filePath);

      const key = path.basename(filePath).toLowerCase();
      this.index[version].layouts[key] = {
        ...parsed,
        _content: content,
      };
    } catch (err) {
      console.error(`[MCP] Erro ao indexar layout ${filePath}: ${err.message}`);
    }
  }

  // ─── CACHE ─────────────────────────────────────────────────────────────────

  _saveToCache() {
    try {
      if (!fs.existsSync(config.cachePath)) {
        fs.mkdirSync(config.cachePath, { recursive: true });
      }

      // Salva sem o _content para economizar espaço no cache de índice
      const slim = {};
      for (const ver of ['1.28', '1.29']) {
        slim[ver] = {
          files:   this.index[ver].files,
          classes: {},
          layouts: {},
        };
        for (const [k, arr] of Object.entries(this.index[ver].classes)) {
          slim[ver].classes[k] = arr.map(({ _content, ...rest }) => rest);
        }
        for (const [k, obj] of Object.entries(this.index[ver].layouts)) {
          const { _content, ...rest } = obj;
          slim[ver].layouts[k] = rest;
        }
      }

      const cacheFile = path.join(config.cachePath, 'index.json');
      const meta      = { builtAt: Date.now(), paths: { '1.28': config.dayz128Path, '1.29': config.dayz129Path } };
      fs.writeFileSync(cacheFile, JSON.stringify({ meta, index: slim }, null, 2));
      console.error(`[MCP] Cache salvo em ${cacheFile}`);
    } catch (err) {
      console.error(`[MCP] Erro ao salvar cache: ${err.message}`);
    }
  }

  _loadFromCache() {
    try {
      const cacheFile = path.join(config.cachePath, 'index.json');
      if (!fs.existsSync(cacheFile)) return false;

      const { meta, index } = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

      // Invalida cache se os caminhos mudaram
      if (meta.paths['1.28'] !== config.dayz128Path || meta.paths['1.29'] !== config.dayz129Path) {
        console.error('[MCP] Cache inválido — caminhos mudaram, reindexando...');
        return false;
      }

      // Cache válido por 24h
      const age = Date.now() - meta.builtAt;
      if (age > 24 * 60 * 60 * 1000) {
        console.error('[MCP] Cache expirado (>24h), reindexando...');
        return false;
      }

      // Recarrega conteúdo dos arquivos para ter _content disponível
      this.index = index;
      this._reloadContents();
      return true;
    } catch {
      return false;
    }
  }

  _reloadContents() {
    for (const ver of ['1.28', '1.29']) {
      for (const arr of Object.values(this.index[ver].classes)) {
        for (const cls of arr) {
          try {
            cls._content = fs.readFileSync(cls.filePath, 'utf8');
          } catch { cls._content = ''; }
        }
      }
      for (const obj of Object.values(this.index[ver].layouts)) {
        try {
          obj._content = fs.readFileSync(obj.filePath, 'utf8');
        } catch { obj._content = ''; }
      }
    }
  }

  // ─── CONSULTAS ─────────────────────────────────────────────────────────────

  // Busca classes por nome (suporte parcial)
  searchClass(name, version = 'both') {
    const results = [];
    const key     = name.toLowerCase();
    const versions = version === 'both' ? ['1.28', '1.29'] : [version];

    for (const ver of versions) {
      for (const [k, arr] of Object.entries(this.index[ver].classes)) {
        if (k.includes(key)) {
          for (const cls of arr) {
            results.push({ version: ver, ...cls });
          }
        }
      }
    }
    return results;
  }

  // Retorna definição completa de uma classe (código-fonte)
  getClassDefinition(name, version) {
    const key     = name.toLowerCase();
    const entries = this.index[version]?.classes[key];
    if (!entries?.length) return null;

    const cls     = entries[0];
    const block   = FileParser.extractClassBlock(cls._content, name);
    return block ? { ...cls, code: block.code, startLine: block.startLine } : cls;
  }

  // Busca por texto livre nos arquivos
  searchText(query, version = 'both') {
    const results  = [];
    const versions = version === 'both' ? ['1.28', '1.29'] : [version];
    const q        = query.toLowerCase();

    for (const ver of versions) {
      for (const arr of Object.values(this.index[ver].classes)) {
        for (const cls of arr) {
          if (cls._content?.toLowerCase().includes(q)) {
            // Encontra as linhas relevantes
            const lines = cls._content.split('\n');
            const hits  = [];
            lines.forEach((line, i) => {
              if (line.toLowerCase().includes(q)) {
                hits.push({ line: i + 1, text: line.trim() });
              }
            });
            if (hits.length) {
              results.push({ version: ver, class: cls.name, file: cls.filePath, hits: hits.slice(0, 5) });
            }
          }
        }
      }
    }
    return results.slice(0, 20);
  }

  // Busca layouts
  searchLayout(name, version = 'both') {
    const results  = [];
    const key      = name.toLowerCase();
    const versions = version === 'both' ? ['1.28', '1.29'] : [version];

    for (const ver of versions) {
      for (const [k, layout] of Object.entries(this.index[ver].layouts)) {
        if (k.includes(key)) {
          results.push({ version: ver, file: k, ...layout });
        }
      }
    }
    return results;
  }

  // ─── COMPARAÇÃO ────────────────────────────────────────────────────────────

  compareClass(className) {
    const cls128 = this.index['1.28'].classes[className.toLowerCase()]?.[0];
    const cls129 = this.index['1.29'].classes[className.toLowerCase()]?.[0];

    if (!cls128 && !cls129) return { status: 'NOT_FOUND' };
    if (!cls128)             return { status: 'ADDED_IN_129', class: cls129 };
    if (!cls129)             return { status: 'REMOVED_IN_129', class: cls128 };

    const methods128 = new Map(cls128.methods.map(m => [m.name, m]));
    const methods129 = new Map(cls129.methods.map(m => [m.name, m]));

    const removed  = [];
    const added    = [];
    const changed  = [];
    const unchanged = [];

    for (const [name, m] of methods128) {
      if (!methods129.has(name)) {
        removed.push(m);
      } else {
        const m2 = methods129.get(name);
        const sig1 = `${m.returnType} ${m.name}(${m.params})`;
        const sig2 = `${m2.returnType} ${m2.name}(${m2.params})`;
        if (sig1 !== sig2) {
          changed.push({ old: m, new: m2 });
        } else {
          unchanged.push(m);
        }
      }
    }

    for (const [name, m] of methods129) {
      if (!methods128.has(name)) added.push(m);
    }

    const hasChanges = removed.length > 0 || added.length > 0 || changed.length > 0;

    return {
      status:      hasChanges ? 'MODIFIED' : 'UNCHANGED',
      className,
      file128:     cls128.filePath,
      file129:     cls129.filePath,
      parent128:   cls128.parent,
      parent129:   cls129.parent,
      parentChanged: cls128.parent !== cls129.parent,
      removed,
      added,
      changed,
      unchanged,
    };
  }

  // Lista todas as classes modificadas entre versões
  listChangedClasses() {
    const all128 = new Set(Object.keys(this.index['1.28'].classes));
    const all129 = new Set(Object.keys(this.index['1.29'].classes));

    const results = {
      removed:  [],
      added:    [],
      modified: [],
    };

    for (const name of all128) {
      if (!all129.has(name)) {
        results.removed.push(name);
      } else {
        const diff = this.compareClass(name);
        if (diff.status === 'MODIFIED') {
          results.modified.push({
            name,
            removedMethods:  diff.removed.length,
            addedMethods:    diff.added.length,
            changedMethods:  diff.changed.length,
          });
        }
      }
    }

    for (const name of all129) {
      if (!all128.has(name)) results.added.push(name);
    }

    return results;
  }

  getStats() {
    return {
      '1.28': {
        classes: Object.keys(this.index['1.28'].classes).length,
        layouts: Object.keys(this.index['1.28'].layouts).length,
        files:   this.index['1.28'].files.length,
      },
      '1.29': {
        classes: Object.keys(this.index['1.29'].classes).length,
        layouts: Object.keys(this.index['1.29'].layouts).length,
        files:   this.index['1.29'].files.length,
      },
    };
  }
}
