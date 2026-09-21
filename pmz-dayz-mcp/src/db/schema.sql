-- src/db/schema.sql — PMZ DayZ MCP (§5 do plano, adaptado: FTS5 sim, sqlite-vec fora do v1)
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- Metadados do índice
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

-- Arquivos-fonte indexados (incremental por hash)
CREATE TABLE IF NOT EXISTS files (
  id            INTEGER PRIMARY KEY,
  path          TEXT NOT NULL,            -- relativo à raiz da versão (ex: 4_World/.../ItemBase.c)
  abs_path      TEXT NOT NULL,            -- absoluto (para get_source)
  module        TEXT,                     -- 1_Core|2_GameLib|3_Game|4_World|5_Mission|config|gui
  kind          TEXT NOT NULL,            -- script|config|layout
  game_version  TEXT NOT NULL,
  sha1          TEXT NOT NULL,
  parse_quality TEXT DEFAULT 'ok',
  UNIQUE(path, game_version)
);
CREATE INDEX IF NOT EXISTS idx_files_ver ON files(game_version);

-- Símbolo unificado (classe, método, membro, enum, enum_value, função, typedef, const)
CREATE TABLE IF NOT EXISTS symbols (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  name_lc       TEXT NOT NULL,            -- lowercase p/ busca case-insensitive
  kind          TEXT NOT NULL,            -- class|method|member|enum|enum_value|function|typedef|const
  file_id       INTEGER NOT NULL REFERENCES files(id),
  line_start    INTEGER NOT NULL,
  line_end      INTEGER,
  owner_id      INTEGER REFERENCES symbols(id),  -- classe/enum dono
  owner_name    TEXT,                     -- nome do dono (desnormalizado p/ consulta rápida)
  signature     TEXT,                     -- assinatura normalizada (métodos)
  return_type   TEXT,
  member_type   TEXT,                     -- tipo do membro
  modifiers     TEXT,                     -- json array
  is_modded     INTEGER DEFAULT 0,        -- 1 se veio de `modded class`
  parent_name   TEXT,                     -- pai direto (classes)
  game_version  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sym_namelc ON symbols(name_lc, game_version);
CREATE INDEX IF NOT EXISTS idx_sym_owner ON symbols(owner_id);
CREATE INDEX IF NOT EXISTS idx_sym_ownername ON symbols(owner_name, game_version);
CREATE INDEX IF NOT EXISTS idx_sym_kind ON symbols(kind, game_version);
CREATE INDEX IF NOT EXISTS idx_sym_parent ON symbols(parent_name, game_version);

-- Parâmetros de método (ordenados)
CREATE TABLE IF NOT EXISTS method_params (
  method_id   INTEGER NOT NULL REFERENCES symbols(id),
  ord         INTEGER NOT NULL,
  type        TEXT NOT NULL,
  name        TEXT,
  default_val TEXT,
  is_out      INTEGER DEFAULT 0,
  owns        INTEGER DEFAULT 0,
  PRIMARY KEY(method_id, ord)
);

-- Grafo de herança (child extends/`:` parent)
CREATE TABLE IF NOT EXISTS inheritance (
  child_id     INTEGER NOT NULL REFERENCES symbols(id),
  child_name   TEXT NOT NULL,
  parent_name  TEXT NOT NULL,
  game_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inh_parent ON inheritance(parent_name, game_version);
CREATE INDEX IF NOT EXISTS idx_inh_child ON inheritance(child_name, game_version);

-- modded class X → alvo
CREATE TABLE IF NOT EXISTS modded_overrides (
  id           INTEGER PRIMARY KEY,
  target_name  TEXT NOT NULL,
  symbol_id    INTEGER NOT NULL REFERENCES symbols(id),
  game_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_modded_target ON modded_overrides(target_name, game_version);

-- Referências / callers
CREATE TABLE IF NOT EXISTS refs (
  symbol_name  TEXT NOT NULL,
  file_id      INTEGER NOT NULL REFERENCES files(id),
  line         INTEGER NOT NULL,
  ref_kind     TEXT,                      -- call|type_use|extends|new|modded
  game_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_refs_name ON refs(symbol_name, game_version);

-- ===== CONFIG =====
CREATE TABLE IF NOT EXISTS config_classes (
  id           INTEGER PRIMARY KEY,
  root         TEXT NOT NULL,
  name         TEXT NOT NULL,
  name_lc      TEXT NOT NULL,
  parent_name  TEXT,
  file_id      INTEGER REFERENCES files(id),
  line_start   INTEGER,
  game_version TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cfg_name ON config_classes(name_lc, game_version);
CREATE INDEX IF NOT EXISTS idx_cfg_parent ON config_classes(parent_name, game_version);

CREATE TABLE IF NOT EXISTS config_params (
  class_id  INTEGER NOT NULL REFERENCES config_classes(id),
  key       TEXT NOT NULL,
  value     TEXT,                         -- escalar (texto) ou json-array
  is_array  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cfgp_class ON config_params(class_id);
CREATE INDEX IF NOT EXISTS idx_cfgp_key ON config_params(key);

-- ===== KNOWLEDGE BASE =====
CREATE TABLE IF NOT EXISTS docs (
  id            INTEGER PRIMARY KEY,
  doc_id        TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  subsystem     TEXT,
  category      TEXT,
  tags          TEXT,                     -- json
  body          TEXT NOT NULL,
  game_version  TEXT,
  last_verified TEXT
);

-- FTS5: símbolos + docs num único índice textual
CREATE VIRTUAL TABLE IF NOT EXISTS fts_search USING fts5(
  name, kind, body,
  ref_id UNINDEXED,          -- id do symbol ou doc
  source_kind UNINDEXED,     -- symbol|doc
  game_version UNINDEXED,
  tokenize = 'unicode61'
);
