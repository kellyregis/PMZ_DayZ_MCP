// src/indexer/FileParser.js
// Parseia arquivos .c (Enforce Script) e .layout (GUI DayZ)

export class FileParser {

  // ─── ENFORCE SCRIPT (.c) ──────────────────────────────────────────────────

  static parseScriptFile(content, filePath) {
    const result = {
      filePath,
      classes: [],
      modded: [],
      enums: [],
    };

    const lines = content.split('\n');

    // Regex para capturar definições de classe
    // Suporta: class Foo, class Foo extends Bar, modded class Foo
    const classRegex    = /^(\s*)(modded\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?\s*$/;
    // Regex para métodos: tipo nome(params)
    const methodRegex   = /^\s+(?:override\s+|static\s+|private\s+|protected\s+)*(\w[\w<>]*)\s+(\w+)\s*\(([^)]*)\)/;
    // Regex para enum
    const enumRegex     = /^\s*enum\s+(\w+)/;

    let currentClass   = null;
    let braceDepth     = 0;
    let classStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line    = lines[i];
      const lineNum = i + 1;

      // Conta chaves para rastrear escopo
      const opens  = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;

      // Enum
      const enumMatch = line.match(enumRegex);
      if (enumMatch) {
        result.enums.push({ name: enumMatch[1], line: lineNum });
      }

      // Classe
      const classMatch = line.match(classRegex);
      if (classMatch) {
        const isModded = !!classMatch[2];
        const name     = classMatch[3];
        const parent   = classMatch[4] || null;

        currentClass = {
          name,
          parent,
          isModded,
          line: lineNum,
          methods: [],
        };

        if (isModded) {
          result.modded.push(currentClass);
        } else {
          result.classes.push(currentClass);
        }
        classStartLine = lineNum;
      }

      // Método (só captura se estiver dentro de uma classe)
      if (currentClass && braceDepth >= 1) {
        const methodMatch = line.match(methodRegex);
        if (methodMatch) {
          currentClass.methods.push({
            returnType: methodMatch[1],
            name:       methodMatch[2],
            params:     methodMatch[3].trim(),
            line:       lineNum,
          });
        }
      }

      braceDepth += opens - closes;

      // Saiu da classe
      if (currentClass && braceDepth <= 0) {
        currentClass = null;
        braceDepth   = 0;
      }
    }

    return result;
  }

  // ─── GUI LAYOUT (.layout) ─────────────────────────────────────────────────

  static parseLayoutFile(content, filePath) {
    const result = {
      filePath,
      rootWidget: null,
      widgets:    [],
    };

    // Captura widgets: <Widget className="..." name="..." ...>
    const widgetRegex = /<(\w+)\s([^>]*)>/g;
    let match;

    while ((match = widgetRegex.exec(content)) !== null) {
      const tag        = match[1];
      const attributes = match[2];

      const nameMatch  = attributes.match(/name="([^"]+)"/);
      const classMatch = attributes.match(/className="([^"]+)"/);

      if (nameMatch || classMatch) {
        const widget = {
          tag,
          name:      nameMatch  ? nameMatch[1]  : null,
          className: classMatch ? classMatch[1] : null,
          rawAttribs: attributes.trim(),
        };
        result.widgets.push(widget);
        if (!result.rootWidget) result.rootWidget = widget;
      }
    }

    return result;
  }

  // ─── UTILITÁRIOS ──────────────────────────────────────────────────────────

  // Extrai um bloco de código de uma classe específica num arquivo
  static extractClassBlock(content, className) {
    const lines = content.split('\n');
    let found      = false;
    let depth      = 0;
    let startLine  = -1;
    const block    = [];

    const classRegex = new RegExp(`(modded\\s+)?class\\s+${className}[\\s{]`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (!found && classRegex.test(line)) {
        found     = true;
        startLine = i + 1;
      }

      if (found) {
        block.push(line);
        depth += (line.match(/\{/g) || []).length;
        depth -= (line.match(/\}/g) || []).length;
        if (depth <= 0 && block.length > 1) break;
      }
    }

    return found ? { code: block.join('\n'), startLine } : null;
  }
}
