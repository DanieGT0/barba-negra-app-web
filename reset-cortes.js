// reset-cortes.js - Script para limpiar tabla cortes y reiniciar contador
const { pool } = require('./db-config');

async function resetCortes() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Iniciando limpieza de tabla cortes...');
    
    // Eliminar todos los datos de la tabla cortes
    const deleteResult = await client.query('DELETE FROM cortes');
    console.log(`✅ Eliminados ${deleteResult.rowCount} cortes`);
    
    // Reiniciar el contador de ID autoincremental
    await client.query('ALTER SEQUENCE cortes_id_seq RESTART WITH 1');
    console.log('✅ Contador de ID reiniciado a 1');
    
    // Verificar que la tabla esté vacía
    const countResult = await client.query('SELECT COUNT(*) as total FROM cortes');
    const total = countResult.rows[0].total;
    
    if (total === '0') {
      console.log('✅ Tabla cortes completamente limpia');
      console.log('✅ El próximo corte tendrá ID = 1');
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
  console.log('⚠️ ADVERTENCIA: Este script eliminará TODOS los cortes');
  console.log('⚠️ Esta acción NO se puede deshacer');
  console.log('');
  
  resetCortes()
    .then(() => {
      console.log('🎉 Limpieza exitosa - Tabla cortes vacía y contador reiniciado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en limpieza:', error);
      process.exit(1);
    });
}

module.exports = { resetCortes };