// migrate-productos.js - Script para migrar la tabla productos
const { pool } = require('./db-config');

async function migrateProductos() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando migración de tabla productos...');
    
    // Verificar estructura actual
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('📋 Columnas actuales:', result.rows);
    
    // Ejecutar migraciones paso a paso con validaciones
    const migraciones = [
      {
        nombre: 'Agregar columna codigo',
        sql: `ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo VARCHAR(100);`
      },
      {
        nombre: 'Agregar restricción única a codigo',
        sql: `ALTER TABLE productos ADD CONSTRAINT productos_codigo_unique UNIQUE (codigo);`
      },
      {
        nombre: 'Renombrar nombre a producto',
        sql: `ALTER TABLE productos RENAME COLUMN nombre TO producto;`
      },
      {
        nombre: 'Renombrar precio a precio_venta',
        sql: `ALTER TABLE productos RENAME COLUMN precio TO precio_venta;`
      },
      {
        nombre: 'Agregar columna comision',
        sql: `ALTER TABLE productos ADD COLUMN IF NOT EXISTS comision DECIMAL(10,2) DEFAULT 0;`
      },
      {
        nombre: 'Renombrar stock a existencia',
        sql: `ALTER TABLE productos RENAME COLUMN stock TO existencia;`
      },
      {
        nombre: 'Agregar columna compra_promedio',
        sql: `ALTER TABLE productos ADD COLUMN IF NOT EXISTS compra_promedio DECIMAL(10,2) DEFAULT 0;`
      },
      {
        nombre: 'Agregar columna minimo',
        sql: `ALTER TABLE productos ADD COLUMN IF NOT EXISTS minimo INTEGER DEFAULT 5;`
      }
    ];
    
    for (const migracion of migraciones) {
      try {
        console.log(`🔧 Ejecutando: ${migracion.nombre}`);
        await client.query(migracion.sql);
        console.log(`✅ ${migracion.nombre} - Completada`);
      } catch (error) {
        console.log(`⚠️ ${migracion.nombre} - ${error.message} (esto puede ser normal si ya existe)`);
      }
    }
    
    // Verificar estructura final
    const finalResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'productos' 
      ORDER BY ordinal_position;
    `);
    
    console.log('🎯 Estructura final:', finalResult.rows);
    console.log('✅ Migración completada');
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  migrateProductos()
    .then(() => {
      console.log('🎉 Migración exitosa');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateProductos };