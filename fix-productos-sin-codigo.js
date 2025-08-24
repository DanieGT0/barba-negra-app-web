// fix-productos-sin-codigo.js - Script para asignar códigos a productos sin código
const { pool } = require('./db-config');

async function fixProductosSinCodigo() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Buscando productos sin código...');
    
    // Buscar productos sin código
    const productosSinCodigo = await client.query(
      'SELECT id, producto FROM productos WHERE codigo IS NULL OR codigo = \'\''
    );
    
    console.log(`📋 Encontrados ${productosSinCodigo.rows.length} productos sin código`);
    
    if (productosSinCodigo.rows.length === 0) {
      console.log('✅ Todos los productos ya tienen código');
      return;
    }
    
    // Asignar códigos automáticamente
    for (const producto of productosSinCodigo.rows) {
      const nuevoCodigo = `P${producto.id.toString().padStart(3, '0')}`;
      
      try {
        await client.query(
          'UPDATE productos SET codigo = $1 WHERE id = $2',
          [nuevoCodigo, producto.id]
        );
        
        console.log(`✅ Asignado código "${nuevoCodigo}" al producto "${producto.producto}"`);
      } catch (error) {
        console.error(`❌ Error asignando código a producto ID ${producto.id}:`, error.message);
      }
    }
    
    console.log('🎉 Proceso completado');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixProductosSinCodigo()
    .then(() => {
      console.log('🎉 Reparación exitosa');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en reparación:', error);
      process.exit(1);
    });
}

module.exports = { fixProductosSinCodigo };