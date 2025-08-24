// migrate-remaining-sqlite.js
// Script para migrar automáticamente las referencias SQLite restantes a PostgreSQL

const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'servergeneral.js');

console.log('🔄 Iniciando migración masiva de SQLite a PostgreSQL...');

// Leer archivo
let content = fs.readFileSync(serverFile, 'utf8');

// Contador de cambios
let changes = 0;

// 1. Reemplazar db.all con await DatabaseHelper.all
content = content.replace(/db\.all\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\[.*?\]|\[\])\s*,\s*\(err,\s*(\w+)\)\s*=>\s*{/g, (match, query, params, resultVar) => {
  changes++;
  // Convertir ? a $1, $2, etc. para PostgreSQL
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  return `try {\n    const ${resultVar} = await DatabaseHelper.all("${pgQuery}", ${params});`;
});

// 2. Reemplazar db.get con await DatabaseHelper.get
content = content.replace(/db\.get\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\[.*?\]|\[\])\s*,\s*\(err,\s*(\w+)\)\s*=>\s*{/g, (match, query, params, resultVar) => {
  changes++;
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  return `try {\n    const ${resultVar} = await DatabaseHelper.get("${pgQuery}", ${params});`;
});

// 3. Reemplazar db.run con await DatabaseHelper.run
content = content.replace(/db\.run\s*\(\s*["'`]([^"'`]+)["'`]\s*,\s*(\[.*?\]|\[\])\s*,\s*function\s*\(err\)\s*{/g, (match, query, params) => {
  changes++;
  let pgQuery = query;
  let paramIndex = 1;
  pgQuery = pgQuery.replace(/\?/g, () => `$${paramIndex++}`);
  return `try {\n    await DatabaseHelper.run("${pgQuery}", ${params});`;
});

// 4. Reemplazar patrones de error handling SQLite
content = content.replace(/if\s*\(err\)\s*{[\s\S]*?return\s+res\.status\(\d+\)\.json\([^}]+\);\s*}/g, (match) => {
  changes++;
  return `// Error handling moved to catch block`;
});

// 5. Agregar catch blocks para funciones async
content = content.replace(/(app\.(get|post|put|delete)\s*\([^,]+,\s*)\(req,\s*res\)\s*=>/g, (match, prefix) => {
  changes++;
  return `${prefix}async (req, res) =>`;
});

// 6. Reemplazar PRAGMA table_info y sqlite_master queries
content = content.replace(/PRAGMA table_info\([^)]+\)/g, () => {
  changes++;
  return "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1";
});

content = content.replace(/SELECT name FROM sqlite_master WHERE type='table' AND name=\?/g, () => {
  changes++;
  return "SELECT table_name as name FROM information_schema.tables WHERE table_name = $1";
});

// 7. Reemplazar db.serialize() con transacciones PostgreSQL
content = content.replace(/db\.serialize\(\(\)\s*=>\s*{/g, () => {
  changes++;
  return `try {\n  await DatabaseHelper.transaction(async (client) => {`;
});

// 8. Cerrar funciones con catch apropiado
content = content.replace(/}\);$/gm, (match) => {
  if (content.indexOf('try {') > content.lastIndexOf(match) - 500) {
    changes++;
    return `} catch (error) {\n    console.error('Database error:', error);\n    res.status(500).json({ mensaje: 'Error interno del servidor' });\n  }\n});`;
  }
  return match;
});

// 9. Eliminar callbacks de error ya no necesarios
content = content.replace(/,\s*\(err\)\s*=>\s*{[\s\S]*?}\s*\)/g, () => {
  changes++;
  return '';
});

console.log(`✅ Migración completada: ${changes} cambios realizados`);

// Escribir archivo modificado
fs.writeFileSync(serverFile, content);

console.log('🎉 Archivo servergeneral.js actualizado exitosamente');
console.log('⚠️ IMPORTANTE: Revisa el archivo para ajustes manuales necesarios');
console.log('⚠️ Algunas funciones pueden necesitar refinamiento adicional');