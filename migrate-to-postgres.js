// migrate-to-postgres.js - Script para migrar datos de SQLite a PostgreSQL
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { pool } = require('./db-config');
const path = require('path');
const bcrypt = require('bcrypt');

// Ruta de la base de datos SQLite
const sqliteDbPath = path.join(__dirname, 'barbanegra.sqlite');

async function migrateData() {
  console.log('🚀 Iniciando migración de SQLite a PostgreSQL...');
  
  // Conectar a SQLite
  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  
  try {
    // Obtener cliente PostgreSQL
    const pgClient = await pool.connect();
    
    console.log('✅ Conectado a ambas bases de datos');
    
    // 1. Migrar usuarios
    await migrateUsuarios(sqliteDb, pgClient);
    
    // 2. Migrar clientes  
    await migrateClientes(sqliteDb, pgClient);
    
    // 3. Migrar empleados
    await migrateEmpleados(sqliteDb, pgClient);
    
    // 4. Migrar productos
    await migrateProductos(sqliteDb, pgClient);
    
    // 5. Migrar ventas
    await migrateVentas(sqliteDb, pgClient);
    
    // 6. Migrar detalle de ventas
    await migrateDetalleVentas(sqliteDb, pgClient);
    
    // 7. Migrar citas
    await migrateCitas(sqliteDb, pgClient);
    
    // 8. Migrar gastos
    await migrateGastos(sqliteDb, pgClient);
    
    console.log('✅ Migración completada exitosamente');
    
    pgClient.release();
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    sqliteDb.close();
  }
}

// Función para migrar usuarios
async function migrateUsuarios(sqliteDb, pgClient) {
  return new Promise(async (resolve, reject) => {
    console.log('📋 Migrando usuarios...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", async (err, tables) => {
      if (err) {
        console.error('Error verificando tabla usuarios en SQLite:', err);
        return reject(err);
      }
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla usuarios no existe en SQLite, creando usuario admin por defecto');
        try {
          const hashedPassword = await bcrypt.hash('admin123', 10);
          await pgClient.query(
            'INSERT INTO usuarios (usuario, password, rol) VALUES ($1, $2, $3) ON CONFLICT (usuario) DO NOTHING',
            ['admin', hashedPassword, 'Admin']
          );
          console.log('✅ Usuario admin creado');
          resolve();
        } catch (error) {
          reject(error);
        }
        return;
      }
      
      sqliteDb.all("SELECT * FROM usuarios", async (err, rows) => {
        if (err) {
          console.error('Error leyendo usuarios de SQLite:', err);
          return reject(err);
        }
        
        try {
          for (const row of rows) {
            if (row.id) {
              await pgClient.query(
                'INSERT INTO usuarios (id, usuario, password, rol, fecha_creacion, activo) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (usuario) DO NOTHING',
                [row.id, row.usuario, row.password, row.rol || 'Usuario', row.fecha_creacion || new Date(), row.activo !== 0]
              );
            } else {
              await pgClient.query(
                'INSERT INTO usuarios (usuario, password, rol, fecha_creacion, activo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (usuario) DO NOTHING',
                [row.usuario, row.password, row.rol || 'Usuario', row.fecha_creacion || new Date(), row.activo !== 0]
              );
            }
          }
          console.log(`✅ ${rows.length} usuarios migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar clientes
async function migrateClientes(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando clientes...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='clientes'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla clientes no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM clientes", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            if (row.id) {
              await pgClient.query(
                'INSERT INTO clientes (id, fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, monto, tipo_pago, categoria, empresa, descuento_porcentaje, direccion, fecha_registro, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)',
                [row.id, row.fecha, row.dui, row.nombre, row.telefono, row.correo, row.membresia, row.fecha_inicio, row.fecha_final, row.monto, row.tipo_pago || 'Efectivo', row.categoria || 'normal', row.empresa || '', row.descuento_porcentaje || 0, row.direccion, row.fecha_registro || new Date(), row.activo !== 0]
              );
            } else {
              await pgClient.query(
                'INSERT INTO clientes (fecha, dui, nombre, telefono, correo, membresia, fecha_inicio, fecha_final, monto, tipo_pago, categoria, empresa, descuento_porcentaje, direccion, fecha_registro, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
                [row.fecha, row.dui, row.nombre, row.telefono, row.correo, row.membresia, row.fecha_inicio, row.fecha_final, row.monto, row.tipo_pago || 'Efectivo', row.categoria || 'normal', row.empresa || '', row.descuento_porcentaje || 0, row.direccion, row.fecha_registro || new Date(), row.activo !== 0]
              );
            }
          }
          console.log(`✅ ${rows.length} clientes migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar empleados
async function migrateEmpleados(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando empleados...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='empleados'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla empleados no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM empleados", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            if (row.id) {
              await pgClient.query(
                'INSERT INTO empleados (id, nombre, telefono, email, puesto, salario, fecha_ingreso, activo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [row.id, row.nombre, row.telefono, row.email, row.puesto, row.salario, row.fecha_ingreso, row.activo !== 0]
              );
            } else {
              // Si no hay ID, usar SERIAL para auto-generar
              await pgClient.query(
                'INSERT INTO empleados (nombre, telefono, email, puesto, salario, fecha_ingreso, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [row.nombre, row.telefono, row.email, row.puesto, row.salario, row.fecha_ingreso, row.activo !== 0]
              );
            }
          }
          console.log(`✅ ${rows.length} empleados migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar productos
async function migrateProductos(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando productos...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='productos'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla productos no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM productos", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            // Adaptarse a la estructura de tu SQLite (puede tener 'producto' en lugar de 'nombre')
            const nombre = row.nombre || row.producto;
            const precio = row.precio || row.precio_venta;
            
            // Validar que tenga nombre y precio
            if (!nombre || precio === null || precio === undefined) {
              console.log(`⚠️  Saltando producto con datos incompletos:`, row);
              continue;
            }
            
            if (row.id) {
              await pgClient.query(
                'INSERT INTO productos (id, nombre, descripcion, precio, categoria, stock, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [row.id, nombre, row.descripcion || row.codigo || '', precio, row.categoria || 'General', row.stock || row.existencia || 0, true]
              );
            } else {
              await pgClient.query(
                'INSERT INTO productos (nombre, descripcion, precio, categoria, stock, activo) VALUES ($1, $2, $3, $4, $5, $6)',
                [nombre, row.descripcion || row.codigo || '', precio, row.categoria || 'General', row.stock || row.existencia || 0, true]
              );
            }
          }
          console.log(`✅ ${rows.length} productos migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar ventas
async function migrateVentas(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando ventas...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='ventas'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla ventas no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM ventas", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            await pgClient.query(
              'INSERT INTO ventas (id, cliente_id, empleado_id, fecha, subtotal, impuesto, total, metodo_pago, estado) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
              [row.id, row.cliente_id, row.empleado_id, row.fecha, row.subtotal, row.impuesto || 0, row.total, row.metodo_pago, row.estado || 'Completada']
            );
          }
          console.log(`✅ ${rows.length} ventas migradas`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar detalle de ventas
async function migrateDetalleVentas(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando detalle de ventas...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='detalle_ventas'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla detalle_ventas no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM detalle_ventas", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            await pgClient.query(
              'INSERT INTO detalle_ventas (id, venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5, $6)',
              [row.id, row.venta_id, row.producto_id, row.cantidad, row.precio_unitario, row.subtotal]
            );
          }
          console.log(`✅ ${rows.length} detalles de venta migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar citas
async function migrateCitas(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando citas...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='citas'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla citas no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM citas", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            // Validar que tenga fecha
            if (!row.fecha) {
              console.log(`⚠️  Saltando cita sin fecha:`, row);
              continue;
            }
            
            if (row.id) {
              await pgClient.query(
                'INSERT INTO citas (id, cliente_id, empleado_id, fecha, hora, servicio, estado, notas) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [row.id, row.cliente_id, row.empleado_id, row.fecha, row.hora || '09:00', row.servicio || 'Corte', row.estado || 'Programada', row.notas || '']
              );
            } else {
              await pgClient.query(
                'INSERT INTO citas (cliente_id, empleado_id, fecha, hora, servicio, estado, notas) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [row.cliente_id, row.empleado_id, row.fecha, row.hora || '09:00', row.servicio || 'Corte', row.estado || 'Programada', row.notas || '']
              );
            }
          }
          console.log(`✅ ${rows.length} citas migradas`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Función para migrar gastos
async function migrateGastos(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando gastos...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='gastos'", (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla gastos no existe en SQLite');
        return resolve();
      }
      
      sqliteDb.all("SELECT * FROM gastos", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            // Validar que tenga concepto y monto
            if (!row.concepto || row.monto === null || row.monto === undefined) {
              console.log(`⚠️  Saltando gasto con datos incompletos:`, row);
              continue;
            }
            
            if (row.id) {
              await pgClient.query(
                'INSERT INTO gastos (id, concepto, monto, fecha, categoria, descripcion) VALUES ($1, $2, $3, $4, $5, $6)',
                [row.id, row.concepto, row.monto, row.fecha || new Date().toISOString().split('T')[0], row.categoria || 'General', row.descripcion || '']
              );
            } else {
              await pgClient.query(
                'INSERT INTO gastos (concepto, monto, fecha, categoria, descripcion) VALUES ($1, $2, $3, $4, $5)',
                [row.concepto, row.monto, row.fecha || new Date().toISOString().split('T')[0], row.categoria || 'General', row.descripcion || '']
              );
            }
          }
          console.log(`✅ ${rows.length} gastos migrados`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('🎉 Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración:', error);
      process.exit(1);
    });
}

module.exports = { migrateData };