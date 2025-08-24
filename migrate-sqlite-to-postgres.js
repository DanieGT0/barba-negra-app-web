// migrate-sqlite-to-postgres.js - Script para migrar consultas SQLite a PostgreSQL
const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'servergeneral.js');

function migrateSQLiteToPostgreSQL() {
  console.log('🔄 Migrando consultas SQLite a PostgreSQL...');
  
  let content = fs.readFileSync(serverFile, 'utf8');
  
  // Contador de reemplazos
  let replacements = 0;
  
  // 1. Reemplazar db.all con DatabaseHelper.all (async/await)
  content = content.replace(/db\.all\("([^"]+)"(?:,\s*([^,\)]+))?,\s*\(err,\s*(\w+)\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g, 
    (match, query, params, rowsVar, body) => {
      replacements++;
      const asyncParams = params ? `, ${params}` : '';
      return `try {
      const ${rowsVar} = await DatabaseHelper.all("${query}"${asyncParams});
      ${body.replace(/if \(err\)[^;]*;/, '').replace(/return res\.status\(500\)[^;]*;/, '')}
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ mensaje: "Error de base de datos" });
    }`;
    });
  
  // 2. Reemplazar db.get con DatabaseHelper.get (async/await)  
  content = content.replace(/db\.get\("([^"]+)"(?:,\s*([^,\)]+))?,\s*\(err,\s*(\w+)\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g,
    (match, query, params, rowVar, body) => {
      replacements++;
      const asyncParams = params ? `, ${params}` : '';
      return `try {
      const ${rowVar} = await DatabaseHelper.get("${query}"${asyncParams});
      ${body.replace(/if \(err\)[^;]*;/, '').replace(/return res\.status\(500\)[^;]*;/, '')}
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ mensaje: "Error de base de datos" });
    }`;
    });
  
  // 3. Reemplazar db.run con DatabaseHelper.run (async/await)
  content = content.replace(/db\.run\("([^"]+)"(?:,\s*([^,\)]+))?,\s*(?:function\s*\(err\)\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}|\(err\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\})/g,
    (match, query, params, body1, body2) => {
      replacements++;
      const body = body1 || body2;
      const asyncParams = params ? `, ${params}` : '';
      return `try {
      await DatabaseHelper.run("${query}"${asyncParams});
      ${body ? body.replace(/if \(err\)[^;]*;/, '').replace(/return res\.status\(500\)[^;]*;/, '') : ''}
    } catch (error) {
      console.error('Database error:', error);
      return res.status(500).json({ mensaje: "Error de base de datos" });
    }`;
    });
  
  // 4. Convertir funciones que usan db a async
  content = content.replace(/app\.(get|post|put|delete)\('([^']+)',\s*\(req,\s*res\)\s*=>/g, 
    'app.$1(\'$2\', async (req, res) =>');
  
  // 5. Eliminar referencias a sqlite3
  content = content.replace(/const sqlite3 = require\('sqlite3'\)\.verbose\(\);?\s*/, '');
  content = content.replace(/const db = new sqlite3\.Database\([^)]+\);?\s*/, '');
  
  // 6. Actualizar parámetros SQLite (? a $1, $2, etc)
  content = content.replace(/\$(\d+)/g, (match, num) => `$${num}`);
  
  // 7. Comentar código de migración de SQLite
  content = content.replace(/(db\.serialize\([^}]+\};\s*\}\);)/g, '// $1 // Comentado - usar PostgreSQL');
  
  // Escribir archivo actualizado
  const backupFile = serverFile + '.backup';
  fs.writeFileSync(backupFile, fs.readFileSync(serverFile));
  console.log(`✅ Backup creado en: ${backupFile}`);
  
  fs.writeFileSync(serverFile, content);
  
  console.log(`✅ Migración completada: ${replacements} reemplazos realizados`);
  console.log('📝 Revisa el archivo y actualiza manualmente las consultas complejas si es necesario');
}

// Ejecutar migración
if (require.main === module) {
  migrateSQLiteToPostgreSQL();
}

module.exports = { migrateSQLiteToPostgreSQL };