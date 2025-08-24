// migrate-to-render.js - Script para migrar datos a PostgreSQL de Render
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

// Ruta de la base de datos SQLite
const sqliteDbPath = path.join(__dirname, 'barbanegra.sqlite');

// Configuración para PostgreSQL de Render
const renderPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateDataToRender() {
  console.log('🚀 Iniciando migración de datos a PostgreSQL de Render...');
  
  // Conectar a SQLite
  const sqliteDb = new sqlite3.Database(sqliteDbPath);
  
  try {
    // Obtener cliente PostgreSQL de Render
    const pgClient = await renderPool.connect();
    
    console.log('✅ Conectado a PostgreSQL de Render');
    
    // Crear tablas primero
    await createRenderTables(pgClient);
    
    // 1. Migrar usuarios
    await migrateUsuarios(sqliteDb, pgClient);
    
    // 2. Migrar clientes  
    await migrateClientes(sqliteDb, pgClient);
    
    // 3. Migrar empleados
    await migrateEmpleados(sqliteDb, pgClient);
    
    // 4. Migrar productos
    await migrateProductos(sqliteDb, pgClient);
    
    // 5. Migrar citas
    await migrateCitas(sqliteDb, pgClient);
    
    // 6. Migrar gastos
    await migrateGastos(sqliteDb, pgClient);
    
    // 7. Crear tablas adicionales
    await createAdditionalTables(pgClient);
    
    console.log('✅ Migración a Render completada exitosamente');
    
    pgClient.release();
    
  } catch (error) {
    console.error('❌ Error durante la migración a Render:', error);
    throw error;
  } finally {
    sqliteDb.close();
  }
}

// Función para crear las tablas en Render
async function createRenderTables(client) {
  try {
    console.log('📋 Creando tablas en PostgreSQL de Render...');
    
    // Crear tablas básicas
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'Usuario',
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(200),
        direccion TEXT,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        telefono VARCHAR(20),
        email VARCHAR(200),
        puesto VARCHAR(100),
        salario DECIMAL(10,2),
        fecha_ingreso DATE,
        activo BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(200) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(10,2) NOT NULL,
        categoria VARCHAR(100),
        stock INTEGER DEFAULT 0,
        activo BOOLEAN DEFAULT true
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ventas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        empleado_id INTEGER REFERENCES empleados(id),
        fecha DATE NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        impuesto DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        metodo_pago VARCHAR(50),
        estado VARCHAR(50) DEFAULT 'Completada'
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id SERIAL PRIMARY KEY,
        venta_id INTEGER REFERENCES ventas(id) ON DELETE CASCADE,
        producto_id INTEGER REFERENCES productos(id),
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS citas (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER REFERENCES clientes(id),
        empleado_id INTEGER REFERENCES empleados(id),
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        servicio VARCHAR(200),
        estado VARCHAR(50) DEFAULT 'Programada',
        notas TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gastos (
        id SERIAL PRIMARY KEY,
        concepto VARCHAR(200) NOT NULL,
        monto DECIMAL(10,2) NOT NULL,
        fecha DATE NOT NULL,
        categoria VARCHAR(100),
        descripcion TEXT
      );
    `);
    
    console.log('✅ Tablas creadas en Render');
    
  } catch (error) {
    console.error('❌ Error creando tablas en Render:', error);
    throw error;
  }
}

// Crear tablas adicionales para funcionalidades avanzadas
async function createAdditionalTables(client) {
  try {
    console.log('📋 Creando tablas adicionales...');
    
    // Tabla para tarjetas de fidelidad
    await client.query(`
      CREATE TABLE IF NOT EXISTS tarjetas_fidelidad (
        id SERIAL PRIMARY KEY,
        codigo VARCHAR(50) UNIQUE,
        cliente_id INTEGER REFERENCES clientes(id),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sellos_actuales INTEGER DEFAULT 0,
        estado VARCHAR(20) DEFAULT 'activa',
        fecha_completada TIMESTAMP
      );
    `);

    // Tabla para historial de sellos
    await client.query(`
      CREATE TABLE IF NOT EXISTS historial_sellos (
        id SERIAL PRIMARY KEY,
        tarjeta_id INTEGER REFERENCES tarjetas_fidelidad(id),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        tipo VARCHAR(50),
        empleado VARCHAR(200),
        factura_id INTEGER,
        observaciones TEXT
      );
    `);
    
    console.log('✅ Tablas adicionales creadas');
  } catch (error) {
    console.error('❌ Error creando tablas adicionales:', error);
    throw error;
  }
}

// Funciones de migración (reutilizamos del script anterior)
async function migrateUsuarios(sqliteDb, pgClient) {
  return new Promise(async (resolve, reject) => {
    console.log('📋 Migrando usuarios a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'", async (err, tables) => {
      if (err) return reject(err);
      
      if (tables.length === 0) {
        console.log('⚠️  Tabla usuarios no existe, creando usuario admin');
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
        if (err) return reject(err);
        
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
          console.log(`✅ ${rows.length} usuarios migrados a Render`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function migrateClientes(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando clientes a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='clientes'", (err, tables) => {
      if (err) return reject(err);
      if (tables.length === 0) return resolve();
      
      sqliteDb.all("SELECT * FROM clientes", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            if (row.id) {
              await pgClient.query(
                'INSERT INTO clientes (id, nombre, telefono, email, direccion, fecha_registro, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [row.id, row.nombre, row.telefono, row.email, row.direccion, row.fecha_registro || new Date(), row.activo !== 0]
              );
            } else {
              await pgClient.query(
                'INSERT INTO clientes (nombre, telefono, email, direccion, fecha_registro, activo) VALUES ($1, $2, $3, $4, $5, $6)',
                [row.nombre, row.telefono, row.email, row.direccion, row.fecha_registro || new Date(), row.activo !== 0]
              );
            }
          }
          console.log(`✅ ${rows.length} clientes migrados a Render`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function migrateEmpleados(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando empleados a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='empleados'", (err, tables) => {
      if (err) return reject(err);
      if (tables.length === 0) return resolve();
      
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
              await pgClient.query(
                'INSERT INTO empleados (nombre, telefono, email, puesto, salario, fecha_ingreso, activo) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [row.nombre, row.telefono, row.email, row.puesto, row.salario, row.fecha_ingreso, row.activo !== 0]
              );
            }
          }
          console.log(`✅ ${rows.length} empleados migrados a Render`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function migrateProductos(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando productos a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='productos'", (err, tables) => {
      if (err) return reject(err);
      if (tables.length === 0) return resolve();
      
      sqliteDb.all("SELECT * FROM productos", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            const nombre = row.nombre || row.producto;
            const precio = row.precio || row.precio_venta;
            
            if (!nombre || precio === null || precio === undefined) {
              console.log(`⚠️  Saltando producto con datos incompletos`);
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
          console.log(`✅ Productos migrados a Render`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function migrateCitas(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando citas a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='citas'", (err, tables) => {
      if (err) return reject(err);
      if (tables.length === 0) return resolve();
      
      sqliteDb.all("SELECT * FROM citas", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            if (!row.fecha) continue;
            
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
          console.log(`✅ Citas migradas a Render`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function migrateGastos(sqliteDb, pgClient) {
  return new Promise((resolve, reject) => {
    console.log('📋 Migrando gastos a Render...');
    
    sqliteDb.all("SELECT name FROM sqlite_master WHERE type='table' AND name='gastos'", (err, tables) => {
      if (err) return reject(err);
      if (tables.length === 0) return resolve();
      
      sqliteDb.all("SELECT * FROM gastos", async (err, rows) => {
        if (err) return reject(err);
        
        try {
          for (const row of rows) {
            if (!row.concepto || row.monto === null || row.monto === undefined) continue;
            
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
          console.log(`✅ Gastos migrados a Render`);
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
  migrateDataToRender()
    .then(() => {
      console.log('🎉 Migración a Render completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la migración a Render:', error);
      process.exit(1);
    });
}

module.exports = { migrateDataToRender };