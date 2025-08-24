// reset-citas.js - Script para limpiar tabla citas y reiniciar contador
const { pool } = require('./db-config');

async function resetCitas() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Iniciando limpieza de tabla citas...');
    
    // Eliminar todos los datos de la tabla citas
    const deleteResult = await client.query('DELETE FROM citas');
    console.log(`✅ Eliminadas ${deleteResult.rowCount} citas`);
    
    // Reiniciar el contador de ID autoincremental
    await client.query('ALTER SEQUENCE citas_id_seq RESTART WITH 1');
    console.log('✅ Contador de ID reiniciado a 1');
    
    // Verificar que la tabla esté vacía
    const countResult = await client.query('SELECT COUNT(*) as total FROM citas');
    const total = countResult.rows[0].total;
    
    if (total === '0') {
      console.log('✅ Tabla citas completamente limpia');
      console.log('✅ La próxima cita tendrá ID = 1');
    } else {
      console.log(`⚠️ Advertencia: Aún quedan ${total} registros en la tabla`);
    }
    
    console.log('🎉 Proceso de limpieza completado');
    
  } catch (error) {
    console.error('❌ Error en la limpieza:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  console.log('⚠️ ADVERTENCIA: Este script eliminará TODAS las citas');
  console.log('⚠️ Esta acción NO se puede deshacer');
  console.log('');
  
  resetCitas()
    .then(() => {
      console.log('🎉 Limpieza exitosa - Tabla citas vacía y contador reiniciado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en limpieza:', error);
      process.exit(1);
    });
}

module.exports = { resetCitas };