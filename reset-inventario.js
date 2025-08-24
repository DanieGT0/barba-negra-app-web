// reset-inventario.js - Script para limpiar tabla productos y reiniciar contador
const { pool } = require('./db-config');

async function resetInventario() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️ Iniciando limpieza de tabla productos...');
    
    // Eliminar todos los datos de la tabla productos
    const deleteResult = await client.query('DELETE FROM productos');
    console.log(`✅ Eliminados ${deleteResult.rowCount} productos`);
    
    // Reiniciar el contador de ID autoincremental
    await client.query('ALTER SEQUENCE productos_id_seq RESTART WITH 1');
    console.log('✅ Contador de ID reiniciado a 1');
    
    // Verificar que la tabla esté vacía
    const countResult = await client.query('SELECT COUNT(*) as total FROM productos');
    const total = countResult.rows[0].total;
    
    if (total === '0') {
      console.log('✅ Tabla productos completamente limpia');
      console.log('✅ El próximo producto tendrá ID = 1');
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
  console.log('⚠️ ADVERTENCIA: Este script eliminará TODOS los productos del inventario');
  console.log('⚠️ Esta acción NO se puede deshacer');
  console.log('');
  
  resetInventario()
    .then(() => {
      console.log('🎉 Limpieza exitosa - Tabla productos vacía y contador reiniciado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en limpieza:', error);
      process.exit(1);
    });
}

module.exports = { resetInventario };