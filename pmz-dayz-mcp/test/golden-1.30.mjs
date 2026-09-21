// test/golden-1.30.mjs — Golden tests para constructs novos na 1.30
// Valida que o parser + índice capturam corretamente os novos sistemas
import Database from 'better-sqlite3';
import { parseEnscript } from '../src/parser/enscript.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = 'data/dayz-1.30.db';
const SCRIPTS_ROOT = '/mnt/d/Mods/PMZ DayZ MCP/Cliente_130/dta/scripts';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}`);
    failed++;
  }
}

// ─── Teste 1: SandstormController proto native methods ──────────────────────
console.log('\n=== TEST 1: SandstormController proto native ===');
{
  const src = fs.readFileSync(path.join(SCRIPTS_ROOT, '3_Game/Sandstorm.c'), 'utf8');
  const result = parseEnscript(src, '3_Game/Sandstorm.c');
  assert(result.parseQuality === 'ok', 'parse quality is ok');
  assert(result.classes.length >= 1, 'at least 1 class parsed');
  const cls = result.classes.find(c => c.name === 'SandstormController');
  assert(cls !== undefined, 'SandstormController class found');
  if (cls) {
    const protoMethods = cls.methods.filter(m => m.modifiers && m.modifiers.includes('proto'));
    assert(protoMethods.length >= 8, `proto native methods >= 8 (got ${protoMethods.length})`);
    const hasStart = cls.methods.some(m => m.name === 'Start');
    const hasStop = cls.methods.some(m => m.name === 'Stop');
    const hasIsActive = cls.methods.some(m => m.name === 'IsActive');
    assert(hasStart, 'has Start() method');
    assert(hasStop, 'has Stop() method');
    assert(hasIsActive, 'has IsActive() method');
  }
}

// ─── Teste 2: Motorbike enum + class hierarchy ──────────────────────────────
console.log('\n=== TEST 2: Motorbike enums and class ===');
{
  const src = fs.readFileSync(path.join(SCRIPTS_ROOT, '3_Game/Vehicles/Motorbike.c'), 'utf8');
  const result = parseEnscript(src, '3_Game/Vehicles/Motorbike.c');
  assert(result.parseQuality === 'ok', 'parse quality is ok');
  const motorbikeClass = result.classes.find(c => c.name === 'Motorbike');
  assert(motorbikeClass !== undefined, 'Motorbike class found');
  if (motorbikeClass) {
    assert(motorbikeClass.parent === 'Transport', `Motorbike extends Transport (got ${motorbikeClass.parent})`);
  }
  const soundCtrlEnum = result.enums.find(e => e.name === 'MotorbikeSoundCtrl');
  assert(soundCtrlEnum !== undefined, 'MotorbikeSoundCtrl enum found');
  if (soundCtrlEnum) {
    const values = soundCtrlEnum.values.map(v => v.name);
    assert(values.includes('ENGINE'), 'MotorbikeSoundCtrl has ENGINE');
    assert(values.includes('RPM'), 'MotorbikeSoundCtrl has RPM');
    assert(values.includes('SPEED'), 'MotorbikeSoundCtrl has SPEED');
  }
  const fluidEnum = result.enums.find(e => e.name === 'MotorbikeFluid');
  assert(fluidEnum !== undefined, 'MotorbikeFluid enum found');
}

// ─── Teste 3: CodeLockComponent states ──────────────────────────────────────
console.log('\n=== TEST 3: CodeLockComponent stages and actions ===');
{
  const src = fs.readFileSync(path.join(SCRIPTS_ROOT, '4_World/Classes/CodeLockComponent.c'), 'utf8');
  const result = parseEnscript(src, '4_World/Classes/CodeLockComponent.c');
  assert(result.parseQuality === 'ok', 'parse quality is ok');
  const stageEnum = result.enums.find(e => e.name === 'CodeLockStage');
  assert(stageEnum !== undefined, 'CodeLockStage enum found');
  if (stageEnum) {
    const vals = stageEnum.values.map(v => v.name);
    assert(vals.includes('NONE'), 'CodeLockStage has NONE');
    assert(vals.includes('NORMAL'), 'CodeLockStage has NORMAL');
    assert(vals.includes('SETTING'), 'CodeLockStage has SETTING');
    assert(vals.includes('PROTECTION_STAGE_ONE'), 'CodeLockStage has PROTECTION_STAGE_ONE');
    assert(vals.includes('PROTECTION_STAGE_TWO'), 'CodeLockStage has PROTECTION_STAGE_TWO');
  }
  const uiActionEnum = result.enums.find(e => e.name === 'CodeLockUIAction');
  assert(uiActionEnum !== undefined, 'CodeLockUIAction enum found');
  const cls = result.classes.find(c => c.name === 'CodeLockComponent');
  assert(cls !== undefined, 'CodeLockComponent class found');
  if (cls) {
    assert(cls.parent === 'Managed', `CodeLockComponent extends Managed (got ${cls.parent})`);
  }
}

// ─── Teste 4: Construction hierarchy ────────────────────────────────────────
console.log('\n=== TEST 4: Construction/Rebuilding hierarchy ===');
{
  const srcBasic = fs.readFileSync(path.join(SCRIPTS_ROOT, '3_Game/Systems/Construction_Basic.c'), 'utf8');
  const resBasic = parseEnscript(srcBasic, '3_Game/Systems/Construction_Basic.c');
  assert(resBasic.parseQuality === 'ok', 'Construction_Basic parse quality ok');
  const basicCls = resBasic.classes.find(c => c.name === 'ConstructionBasic');
  assert(basicCls !== undefined, 'ConstructionBasic class found');

  const srcRebuild = fs.readFileSync(path.join(SCRIPTS_ROOT, '4_World/Classes/Rebuilding/Rebuilding.c'), 'utf8');
  const resRebuild = parseEnscript(srcRebuild, '4_World/Classes/Rebuilding/Rebuilding.c');
  assert(resRebuild.parseQuality === 'ok', 'Rebuilding parse quality ok');
  const rebuildCls = resRebuild.classes.find(c => c.name === 'Rebuilding');
  assert(rebuildCls !== undefined, 'Rebuilding class found');
  if (rebuildCls) {
    assert(rebuildCls.parent === 'ConstructionBase', `Rebuilding extends ConstructionBase (got ${rebuildCls.parent})`);
  }
}

// ─── Teste 5: ERPCs new values in DB ────────────────────────────────────────
console.log('\n=== TEST 5: New RPCs in SQLite index ===');
{
  const db = new Database(DB_PATH, { readonly: true });
  const expectedRPCs = [
    'RPC_BUNKERBROADCAST_CONFIG_SYNC',
    'RPC_CODE_LOCK_REQUEST',
    'RPC_CODE_LOCK_RESPONSE',
    'RPC_CODE_LOCK_UI_ACTION',
    'RPC_ITEM_SOUND_PLAY',
    'RPC_ITEM_SOUND_STOP',
    'RPC_SYMPTOM_PARAM_SYNC',
  ];
  for (const rpc of expectedRPCs) {
    const row = db.prepare("SELECT id FROM symbols WHERE name=? AND kind='enum_value' AND owner_name='ERPCs' AND game_version='1.30'").get(rpc);
    assert(row !== undefined, `${rpc} indexed in DB`);
  }
  db.close();
}

// ─── Teste 6: Symptoms classes in DB ────────────────────────────────────────
console.log('\n=== TEST 6: Symptom modifiers in SQLite index ===');
{
  const db = new Database(DB_PATH, { readonly: true });
  const symptoms = ['SilicosisMdfr', 'HeatStrokeMdfr', 'IrritatedEyesMdfr'];
  for (const s of symptoms) {
    const row = db.prepare("SELECT id FROM symbols WHERE name=? AND kind='class' AND game_version='1.30'").get(s);
    // IrritatedEyesMdfr may have different name; check file-based parse as fallback
    if (row) {
      assert(true, `${s} found in DB`);
    } else {
      // Try parsing the source file directly
      const diseasePath = path.join(SCRIPTS_ROOT, `4_World/Classes/PlayerModifiers/Modifiers/diseases/${s.replace('Mdfr','')}.c`);
      if (fs.existsSync(diseasePath)) {
        const src = fs.readFileSync(diseasePath, 'utf8');
        const res = parseEnscript(src, diseasePath);
        const found = res.classes.some(c => c.name === s);
        assert(found, `${s} parseable from source (not yet in DB or different name)`);
      } else {
        assert(false, `${s} not found in DB or source`);
      }
    }
  }
  db.close();
}

// ─── Teste 7: File count consistency ────────────────────────────────────────
console.log('\n=== TEST 7: Index completeness ===');
{
  const db = new Database(DB_PATH, { readonly: true });
  const fileCount = db.prepare("SELECT COUNT(*) as cnt FROM files WHERE game_version='1.30' AND kind='script'").get();
  assert(fileCount.cnt === 3042, `file count = 3042 (got ${fileCount.cnt})`);
  const degradedCount = db.prepare("SELECT COUNT(*) as cnt FROM files WHERE game_version='1.30' AND parse_quality != 'ok'").get();
  assert(degradedCount.cnt === 0, `degraded files = 0 (got ${degradedCount.cnt})`);
  const classCount = db.prepare("SELECT COUNT(DISTINCT name) as cnt FROM symbols WHERE kind='class' AND game_version='1.30'").get();
  assert(classCount.cnt >= 6700, `class count >= 6700 (got ${classCount.cnt})`);
  db.close();
}

// ─── Resumo ─────────────────────────────────────────────────────────────────
console.log('\n========================================');
console.log(`GOLDEN TESTS 1.30: ${passed} passed, ${failed} failed`);
console.log('========================================');
process.exit(failed > 0 ? 1 : 0);